import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBadgerBalances } from './balance'
import { getBadgerContractsFromAPI } from './contract'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBadgerContractsFromAPI(ctx)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getBadgerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
