import type { AdapterConfig, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLeverageFarming } from './leverage'
import type { PoolContract } from './pools'
import { getContractsRegister, getPoolsBalances, getPoolsContracts } from './pools'

export const getContracts = async (ctx: BaseContext) => {
  const contractsRegister = await getContractsRegister(ctx)
  const pools = await getPoolsContracts(ctx, contractsRegister)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

const getGearboxBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getPoolsBalances(ctx, pools as PoolContract[]), getLeverageFarming(ctx, pools)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getGearboxBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1640217600,
}
