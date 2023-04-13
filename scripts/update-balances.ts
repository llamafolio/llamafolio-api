import { v4 as uuidv4 } from 'uuid'

import { adapterById } from '../src/adapters'
import { selectDefinedAdaptersContractsProps } from '../src/db/adapters'
import { Balance as BalanceStore, insertBalances } from '../src/db/balances'
import {
  BalancesGroup,
  deleteBalancesGroupsCascadeByFromAddress,
  insertBalancesGroups,
} from '../src/db/balances-groups'
import { groupContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import { Balance, BalancesConfig, BalancesContext } from '../src/lib/adapter'
import { groupBy, groupBy2, keyBy2 } from '../src/lib/array'
import { balancesTotalBreakdown, sanitizeBalances } from '../src/lib/balance'
import { Chain } from '../src/lib/chains'
import { getContractsInteractions, HASURA_HEADERS } from '../src/lib/indexer'
import { getPricedBalances } from '../src/lib/price'
import { isNotNullish } from '../src/lib/type'

type ExtendedBalance = Balance & {
  adapterId: string
  groupIdx: number
}

interface BalancesGroupExtended {
  balances: ExtendedBalance[]
  healthFactor?: number
}

interface ExtendedBalancesConfig extends BalancesConfig {
  adapterId: string
  chain: Chain
  groups: BalancesGroupExtended[]
}

function help() {
  console.log('pnpm update-balances {address}')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: update-balances.ts
  // argv[2]: address
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const address = process.argv[2].toLowerCase()

  const client = await pool.connect()

  try {
    // Fetch all protocols (with their associated contracts) that the user interacted with
    // and all unique tokens he received
    const [{ contracts, erc20Transfers: tokens }, adaptersContractsProps] = await Promise.all([
      getContractsInteractions({ fromAddress: address, headers: HASURA_HEADERS }),
      selectDefinedAdaptersContractsProps(client),
    ])

    const contractsByAdapterIdChain = groupBy2(contracts, 'adapterId', 'chain')
    contractsByAdapterIdChain['wallet'] = groupBy(tokens, 'chain')
    const adaptersContractsPropsByIdChain = keyBy2(adaptersContractsProps, 'id', 'chain')
    // add adapters with contracts_props, even if there was no user interaction with any of the contracts
    for (const adapter of adaptersContractsProps) {
      if (!contractsByAdapterIdChain[adapter.id]) {
        contractsByAdapterIdChain[adapter.id] = {}
      }
      if (!contractsByAdapterIdChain[adapter.id][adapter.chain]) {
        contractsByAdapterIdChain[adapter.id][adapter.chain] = []
      }
    }

    const adapterIds = Object.keys(contractsByAdapterIdChain)
    // list of all [adapterId, chain]
    const adapterIdsChains = adapterIds.flatMap((adapterId) =>
      Object.keys(contractsByAdapterIdChain[adapterId]).map((chain) => [adapterId, chain] as [string, Chain]),
    )

    console.log('Interacted with protocols:', adapterIds)

    // Run adapters `getBalances` only with the contracts the user interacted with
    const adaptersBalancesConfigsRes = await Promise.all(
      adapterIdsChains.map(async ([adapterId, chain]) => {
        const adapter = adapterById[adapterId]
        if (!adapter) {
          console.error(`Could not find adapter with id`, adapterId)
          return
        }
        const handler = adapter[chain]
        if (!handler) {
          console.error(`Could not find chain handler for`, [adapterId, chain])
          return
        }

        try {
          const hrstart = process.hrtime()

          const contracts = groupContracts(contractsByAdapterIdChain[adapterId][chain]) || []
          const props = adaptersContractsPropsByIdChain[adapterId]?.[chain]?.contractsProps || {}

          const ctx: BalancesContext = { address, chain, adapterId }

          const balancesConfig = await handler.getBalances(ctx, contracts, props)

          const hrend = process.hrtime(hrstart)

          const balancesLength = balancesConfig.groups.reduce((acc, group) => acc + (group.balances?.length || 0), 0)
          console.log(
            `[${adapterId}][${chain}] getBalances ${contractsByAdapterIdChain[adapterId][chain].length} contracts, found ${balancesLength} balances in %ds %dms`,
            hrend[0],
            hrend[1] / 1000000,
          )

          const extendedBalancesConfig: ExtendedBalancesConfig = {
            ...balancesConfig,
            // Tag balances with adapterId abd groupIdx
            groups: balancesConfig.groups.map((balancesGroup, groupIdx) => ({
              ...balancesGroup,
              balances: balancesGroup.balances.map((balance) => ({ ...balance, adapterId, groupIdx })),
            })),
            adapterId,
            chain,
          }

          return extendedBalancesConfig
        } catch (error) {
          console.error(`[${adapterId}][${chain}]: Failed to getBalances`, error)
          return
        }
      }),
    )

    const adaptersBalancesConfigs = adaptersBalancesConfigsRes.filter(isNotNullish)

    // Ungroup balances to make only 1 call to the price API
    const balances: ExtendedBalance[] = []
    for (const balancesConfig of adaptersBalancesConfigs) {
      for (const group of balancesConfig.groups) {
        for (const balance of group.balances) {
          balances.push(balance)
        }
      }
    }

    const sanitizedBalances = sanitizeBalances(balances)

    const hrstart = process.hrtime()

    const pricedBalances = await getPricedBalances(sanitizedBalances)

    const hrend = process.hrtime(hrstart)

    console.log(
      `getPricedBalances ${sanitizedBalances.length} balances, found ${pricedBalances.length} balances in %ds %dms`,
      hrend[0],
      hrend[1] / 1000000,
    )

    // Group balances back by adapter/chain
    const pricedBalancesByAdapterIdChain = groupBy2(pricedBalances, 'adapterId', 'chain')

    const now = new Date()

    const balancesGroupsStore: BalancesGroup[] = []
    const balancesStore: BalanceStore[] = []

    for (const balanceConfig of adaptersBalancesConfigs) {
      const pricedBalances = pricedBalancesByAdapterIdChain[balanceConfig.adapterId]?.[balanceConfig.chain]
      if (!pricedBalances || pricedBalances.length === 0) {
        continue
      }

      const balancesByGroupIdx = groupBy(pricedBalances.filter(isNotNullish), 'groupIdx')

      for (let groupIdx = 0; groupIdx < balanceConfig.groups.length; groupIdx++) {
        const balances = balancesByGroupIdx[groupIdx]
        if (!balances || balances.length === 0) {
          continue
        }

        const id = uuidv4()

        const balancesGroup: BalancesGroup = {
          id,
          fromAddress: address,
          adapterId: balanceConfig.adapterId,
          chain: balanceConfig.chain,
          ...balancesTotalBreakdown(balances),
          timestamp: now,
          healthFactor: balanceConfig.groups[groupIdx].healthFactor,
        }

        for (const balance of balances) {
          balancesStore.push({ groupId: id, ...balance })
        }

        balancesGroupsStore.push(balancesGroup)
      }
    }

    // Update balances
    await client.query('BEGIN')

    // Delete old balances
    await deleteBalancesGroupsCascadeByFromAddress(client, address)

    // Insert balances groups
    await insertBalancesGroups(client, balancesGroupsStore)

    // Insert new balances
    await insertBalances(client, balancesStore)

    await client.query('COMMIT')
  } catch (e) {
    console.log('Failed to update balances', e)
    await client.query('ROLLBACK')
  } finally {
    client.release(true)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
