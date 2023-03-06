import format from 'pg-format'

import { adapterById } from '../src/adapters'
import { selectDefinedAdaptersContractsProps } from '../src/db/adapters'
import { insertBalances } from '../src/db/balances'
import { BalancesSnapshot, insertBalancesSnapshots } from '../src/db/balances-snapshots'
import { getAllContractsInteractions, getAllTokensInteractions } from '../src/db/contracts'
import { groupContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import { Balance, BalancesConfig, BalancesContext } from '../src/lib/adapter'
import { groupBy, groupBy2, keyBy2 } from '../src/lib/array'
import { resolveStandardBalances, sanitizeBalances, sumBalances } from '../src/lib/balance'
import { strToBuf } from '../src/lib/buf'
import { Chain } from '../src/lib/chains'
import { getPricedBalances } from '../src/lib/price'
import { isNotNullish } from '../src/lib/type'

interface ExtendedBalance extends Balance {
  adapterId: string
}

interface ExtendedBalancesConfig extends BalancesConfig {
  adapterId: string
  chain: Chain
  balances: ExtendedBalance[]
}

function help() {
  console.log('npm run update-balances {address}')
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
    const [contracts, tokens, adaptersContractsProps] = await Promise.all([
      getAllContractsInteractions(client, address),
      getAllTokensInteractions(client, address),
      selectDefinedAdaptersContractsProps(client),
    ])

    for (const token of tokens) {
      token.adapterId = 'wallet'
    }

    // Batch pre-fetch tokens balances with multicalls
    const allContractsByChain = groupBy([...contracts, ...tokens], 'chain')
    const allContracts = await Promise.all(
      Object.keys(allContractsByChain).map((chain) =>
        resolveStandardBalances({ chain, address, adapterId: '' }, allContractsByChain[chain]),
      ),
    )

    const contractsByAdapterIdChain = groupBy2(allContracts.flat(2), 'adapterId', 'chain')
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
          console.error(`Could not find adapter`, adapterId)
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

          console.log(
            `[${adapterId}][${chain}] getBalances ${contractsByAdapterIdChain[adapterId][chain].length} contracts, found ${balancesConfig.balances.length} balances in %ds %dms`,
            hrend[0],
            hrend[1] / 1000000,
          )

          const extendedBalancesConfig: ExtendedBalancesConfig = {
            ...balancesConfig,
            // Tag balances with adapterId
            balances: balancesConfig.balances.map((balance) => ({ ...balance, adapterId })),
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
    const balances = adaptersBalancesConfigs.flatMap((balanceConfig) => balanceConfig?.balances).filter(isNotNullish)

    const sanitizedBalances = sanitizeBalances(balances)

    const hrstart = process.hrtime()

    const pricedBalances = await getPricedBalances(sanitizedBalances)

    const hrend = process.hrtime(hrstart)

    console.log(
      `getPricedBalances ${sanitizedBalances.length} balances, found ${pricedBalances.length} balances in %ds %dms`,
      hrend[0],
      hrend[1] / 1000000,
    )

    // Group balances back by adapter
    const pricedBalancesByAdapterId = groupBy(
      (pricedBalances as ExtendedBalance[]).filter((pricedBalance) => pricedBalance.adapterId),
      'adapterId',
    )

    const now = new Date()

    const balancesSnapshots = adaptersBalancesConfigs
      .map((balanceConfig) => {
        const pricedBalances = pricedBalancesByAdapterId[balanceConfig.adapterId]
        if (!pricedBalances) {
          return null
        }

        const balancesSnapshot: BalancesSnapshot = {
          fromAddress: address,
          adapterId: balanceConfig.adapterId,
          chain: balanceConfig.chain,
          balanceUSD: sumBalances(
            pricedBalances.filter((balance) => isNotNullish(balance) && balance.chain === balanceConfig.chain),
          ),
          timestamp: now,
          healthFactor: balanceConfig.healthFactor,
        }

        return balancesSnapshot
      })
      .filter(isNotNullish)

    // Update balances
    await client.query('BEGIN')

    // Insert balances snapshots
    await insertBalancesSnapshots(client, balancesSnapshots, address)

    // Delete old balances
    await client.query(format('delete from balances where from_address = %L::bytea', [strToBuf(address)]), [])

    // Insert new balances
    await insertBalances(
      client,
      Object.keys(pricedBalancesByAdapterId).map((adapterId) => ({
        balances: pricedBalancesByAdapterId[adapterId],
        adapterId,
        fromAddress: address,
        timestamp: now,
      })),
    )

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
