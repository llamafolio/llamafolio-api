import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import Pairs from './pairs.json'

export const getContracts = async () => {
  const pairs = Pairs as Contract[]

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
  })

  return {
    balances: balances.map((balance) => ({ ...balance, category: 'farm' })),
  }
}
