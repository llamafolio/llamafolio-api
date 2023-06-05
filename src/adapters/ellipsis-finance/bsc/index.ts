import { getEllipsisContracts } from '@adapters/ellipsis-finance/bsc/contract'
import { getEllipsisFarmingBalances } from '@adapters/ellipsis-finance/bsc/farm'
import { getEllipsisLockerBalance } from '@adapters/ellipsis-finance/bsc/locker'
import { getEllipsisLpBalances } from '@adapters/ellipsis-finance/bsc/lp'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterChef: Contract = {
  chain: 'bsc',
  address: '0x5B74C99AA2356B4eAa7B85dC486843eDff8Dfdbe',
}

const locker: Contract = {
  chain: 'bsc',
  address: '0x22a93f53a0a3e6847d05dd504283e8e296a49aae',
  token: '0xaf41054c1487b0e5e2b9250c0332ecbce6ce9d71',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getEllipsisContracts(ctx)

  return {
    contracts: { pools, masterChef, locker },
  }
}

const ellipsisBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getEllipsisLpBalances(ctx, pools), getEllipsisFarmingBalances(ctx, pools, masterChef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: ellipsisBalances,
    locker: getEllipsisLockerBalance,
  })

  return {
    groups: [{ balances }],
  }
}
