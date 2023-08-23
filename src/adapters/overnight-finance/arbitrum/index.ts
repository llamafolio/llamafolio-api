import { farmers } from '@adapters/overnight-finance/arbitrum/contract'
import { getOvernightFarmBalances } from '@adapters/overnight-finance/common/balance'
import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = () => {
  return {
    contracts: { farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getOvernightFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
