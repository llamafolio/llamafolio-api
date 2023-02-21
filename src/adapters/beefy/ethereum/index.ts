import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBeefyContracts } from '../common/contract'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBeefyContracts(ctx)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  console.log(contracts)

  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {})

  return {
    balances,
  }
}
