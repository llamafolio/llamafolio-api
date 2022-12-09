import { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain } from '@lib/chains'

import { getFarmBalances } from './farm'
import { getPoolsContracts, getPoolsSupplies } from './pools'
import { getStakeBalances } from './stake'

export const getContracts = async () => {
  const pools = await getPoolsContracts('ethereum')

  return {
    contracts: { pools },
  }
}

async function getAllBalances(ctx: BalancesContext, chain: Chain, pools: Contract[]) {
  const poolsSupplies = await getPoolsSupplies(chain, pools)
  return Promise.all([getFarmBalances(ctx, chain, poolsSupplies), getStakeBalances(ctx, chain, poolsSupplies)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    pools: getAllBalances,
  })

  return {
    balances,
  }
}
