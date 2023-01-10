import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances, getPoolsContracts } from '../common/balance'

const MiniChef: Contract = {
  chain: 'ethereum',
  address: '0xd10eF2A513cEE0Db54E959eF16cAc711470B62cF',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, MiniChef)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getPoolsBalances(...args, MiniChef),
  })

  return {
    balances,
  }
}
