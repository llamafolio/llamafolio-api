import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getContractsRegister, getPoolsBalances, getPoolsContracts } from './pools'

export const getContracts = async (ctx: BaseContext) => {
  const contractsRegister = await getContractsRegister(ctx)
  const pools = await getPoolsContracts(ctx, contractsRegister)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPoolsBalances,
  })

  return {
    balances,
  }
}
