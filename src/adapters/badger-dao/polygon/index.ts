import { getBadgerBalances } from '@adapters/badger-dao/common/farm'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBadgerContractsFromAPI } from '../common/contract'

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
