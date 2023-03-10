import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFarmBalances, getFarmContracts } from './farm'

const MapleFactory: Contract = {
  chain: 'ethereum',
  name: 'PoolFactory',
  address: '0x2Cd79F7f8b38B9c0D80EA6B230441841A31537eC',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getFarmContracts(ctx, MapleFactory)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
