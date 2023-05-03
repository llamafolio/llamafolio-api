import type { Balance, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'

import { getTokemakContracts } from './contract'
import { getTokemakLockerBalances } from './locker'
import { getTokemakStakeBalances } from './stake'

const staker: Contract = {
  chain: 'ethereum',
  address: '0x96f98ed74639689c3a11daf38ef86e59f43417d3',
  underlyings: ['0x2e9d63788249371f1DFC918a52f8d799F4a38C94'],
}

const poolManager: Contract = {
  chain: 'ethereum',
  address: '0xa86e412109f77c45a3bc1c5870b880492fb86a14',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xa374a62ddbd21e3d5716cb04821cb710897c0972',
  underlyings: ['0x2e9d63788249371f1DFC918a52f8d799F4a38C94'],
  manager: '0xa86e412109f77c45a3bc1c5870b880492fb86a14',
  decimals: 18,
  symbol: 'accTOKE',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getTokemakContracts(ctx, poolManager)

  return {
    contracts: { staker, pools, locker },
  }
}

const getTokemakFarmBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  return (await getSingleStakeBalances(ctx, pools)).map((res) => ({ ...res, category: 'farm' }))
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getTokemakStakeBalances,
    pools: getTokemakFarmBalances,
    locker: getTokemakLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
