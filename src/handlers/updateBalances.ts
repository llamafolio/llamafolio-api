import { adapterById } from '@adapters/index'
import { selectDefinedAdaptersContractsProps } from '@db/adapters'
import type { Balance as BalanceStore } from '@db/balances'
import { updateBalances } from '@db/balances'
import type { BalancesGroup } from '@db/balances-groups'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import type { Balance, BalancesConfig, BalancesContext, PricedBalance } from '@lib/adapter'
import { groupBy, groupBy2, keyBy2 } from '@lib/array'
import { fmtBalanceBreakdown, sanitizeBalances } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { Chain } from '@lib/chains'
import { sum } from '@lib/math'
import { getPricedBalances } from '@lib/price'
import { isNotNullish } from '@lib/type'
import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

type ExtendedBalance = (Balance | PricedBalance) & {
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

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false // !important to reuse pool

  const { address } = event as APIGatewayProxyEvent & { address?: string }

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  console.log('Update balances of address', address)

  const client = await pool.connect()

  try {
    // Fetch all protocols (with their associated contracts) that the user interacted with
    // and all unique tokens he received
    const [contracts, adaptersContractsProps] = await Promise.all([
      getAllContractsInteractions(client, address),
      selectDefinedAdaptersContractsProps(client),
    ])

    const contractsByAdapterIdChain = groupBy2(contracts, 'adapterId', 'chain')
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

        const groupBalances = balances.map((balance) => ({ groupId: id, ...fmtBalanceBreakdown(balance) }))

        for (const balance of groupBalances) {
          balancesStore.push(balance)
        }

        const balancesGroup: BalancesGroup = {
          id,
          fromAddress: address,
          adapterId: balanceConfig.adapterId,
          chain: balanceConfig.chain,
          balanceUSD: sum(groupBalances.map((balance) => balance.balanceUSD || 0)),
          rewardUSD: sum(groupBalances.map((balance) => balance.rewardUSD || 0)),
          debtUSD: sum(groupBalances.map((balance) => balance.debtUSD || 0)),
          timestamp: now,
          healthFactor: balanceConfig.groups[groupIdx].healthFactor,
        }

        balancesGroupsStore.push(balancesGroup)
      }
    }

    // Update balances
    await updateBalances(client, address, balancesGroupsStore, balancesStore)

    return success({})
  } catch (error) {
    console.error('Failed to update balances', { error, address })
    return serverError('Failed to update balances')
  } finally {
    client.release(true)
  }
}
