import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolBalancesFromAPI } from '../common/balance'
import { getPoolContractsFromAPI } from '../common/contract'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolContractsFromAPI(ctx, 1)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getPoolBalancesFromAPI(...args, 1),
  })

  return {
    balances,
  }
}
