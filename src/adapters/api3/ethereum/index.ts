import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getApi3StakeBalances } from './balance'

const api3Token: Token = {
  chain: 'ethereum',
  address: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
  decimals: 18,
  symbol: 'API3',
}

const api3Dao: Contract = {
  chain: 'ethereum',
  address: '0x6dd655f10d4b9e242ae186d9050b68f725c76d76',
  underlyings: [api3Token],
}

export const getContracts = () => {
  return {
    contracts: { api3Dao },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    api3Dao: getApi3StakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
