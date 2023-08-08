import { adapterById } from '@adapters/index'
import type { Balance as BalanceStore } from '@db/balances'
import { updateBalances as updateDBBalances } from '@db/balances'
import type { BalancesGroup } from '@db/balances-groups'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import type { Balance, BalancesConfig, BalancesContext, PricedBalance } from '@lib/adapter'
import { groupBy, groupBy2 } from '@lib/array'
import { fmtBalanceBreakdown, sanitizeBalances, sanitizePricedBalances } from '@lib/balance'
import { type Chain, chains } from '@lib/chains'
import { sum } from '@lib/math'
import { getPricedBalances } from '@lib/price'
import { isNotNullish } from '@lib/type'
import type { PoolClient } from 'pg'
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

/**
 *
 * @param client must be connected
 * @param address
 */
export async function updateBalances(client: PoolClient, address: `0x${string}`) {
  // Fetch all protocols (with their associated contracts) that the user interacted with
  // and all unique tokens he received
  const contracts = await getAllContractsInteractions(client, address)

  const contractsByAdapterIdChain = groupBy2(contracts, 'adapterId', 'chain')

  // add wallet adapter on each chain (in case there's no interaction at all)
  for (const chain of chains) {
    if (!contractsByAdapterIdChain.wallet) {
      contractsByAdapterIdChain.wallet = {}
    }
    if (!contractsByAdapterIdChain.wallet[chain.id]) {
      contractsByAdapterIdChain.wallet[chain.id] = []
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

        const ctx: BalancesContext = { address, chain, adapterId }

        const balancesConfig = await handler.getBalances(ctx, contracts)

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

  const sanitizedPricedBalances = sanitizePricedBalances(pricedBalances)

  const hrend = process.hrtime(hrstart)

  console.log(
    `getPricedBalances ${sanitizedBalances.length} balances, found ${balances.length} balances, ${sanitizedPricedBalances.length} sanitized in %ds %dms`,
    hrend[0],
    hrend[1] / 1000000,
  )

  // Group balances back by adapter/chain
  const pricedBalancesByAdapterIdChain = groupBy2(sanitizedPricedBalances, 'adapterId', 'chain')

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

      const balancesGroup: BalancesGroup & { balances: any[] } = {
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
  return updateDBBalances(client, address, balancesGroupsStore, balancesStore)
}
