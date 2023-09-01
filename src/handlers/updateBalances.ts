import { adapterById } from '@adapters/index'
import type { ClickHouseClient } from '@clickhouse/client'
import type { Balance } from '@db/balances'
import { insertBalances } from '@db/balances'
import { getContractsInteractions, groupContracts } from '@db/contracts'
import type { BalancesContext } from '@lib/adapter'
import { groupBy, groupBy2 } from '@lib/array'
import { fmtBalanceBreakdown, sanitizeBalances, sanitizePricedBalances } from '@lib/balance'
import { type Chain, chains } from '@lib/chains'
import { avg, sum } from '@lib/math'
import { getPricedBalances } from '@lib/price'

export async function updateBalances(client: ClickHouseClient, address: `0x${string}`) {
  // Fetch all protocols (with their associated contracts) that the user interacted with
  // and all unique tokens he received
  const contracts = await getContractsInteractions(client, address)

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

  const now = new Date()
  const balances: Balance[] = []

  // Run adapters `getBalances` only with the contracts the user interacted with
  await Promise.all(
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

        let balancesLength = 0

        for (let groupIdx = 0; groupIdx < balancesConfig.groups.length; groupIdx++) {
          const group = balancesConfig.groups[groupIdx]
          for (const balance of group.balances) {
            balancesLength++

            balance.groupIdx = groupIdx
            balance.adapterId = adapterId
            balance.timestamp = now
            balance.healthFactor = group.healthFactor
            balance.fromAddress = address

            balances.push(balance)
          }
        }

        console.log(
          `[${adapterId}][${chain}] getBalances ${contractsByAdapterIdChain[adapterId][chain].length} contracts, found ${balancesLength} balances in %ds %dms`,
          hrend[0],
          hrend[1] / 1000000,
        )
      } catch (error) {
        console.error(`[${adapterId}][${chain}]: Failed to getBalances`, error)
      }
    }),
  )

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

  const balancesWithBreakdown = sanitizedPricedBalances.map(fmtBalanceBreakdown)

  // Update balances
  await insertBalances(client, balancesWithBreakdown)

  // Group back
  const balancesGroups: any[] = []

  const balancesByChain = groupBy(balancesWithBreakdown, 'chain')

  for (const chain in balancesByChain) {
    const balancesByAdapterId = groupBy(balancesByChain[chain], 'adapterId')

    for (const adapterId in balancesByAdapterId) {
      const balancesByGroupIdx = groupBy(balancesByAdapterId[adapterId], 'groupIdx')

      for (const groupIdx in balancesByGroupIdx) {
        const balances = balancesByGroupIdx[groupIdx]

        balancesGroups.push({
          adapterId,
          chain,
          balanceUSD: sum(balances.map((balance) => balance.balanceUSD || 0)),
          debtUSD: sum(balances.map((balance) => balance.debtUSD || 0)),
          rewardUSD: sum(balances.map((balance) => balance.rewardUSD || 0)),
          healthFactor: avg(
            balances.map((balance) => balance.healthFactor || 0),
            balances.length,
          ),
          timestamp: balances[0]?.timestamp,
          balances,
        })
      }
    }
  }

  return balancesGroups
}
