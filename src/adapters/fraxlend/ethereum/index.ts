import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendBorrowBalances } from './lend'
import { getPairsContracts } from './registry'

const fraxLendPairRegistry = '0xd6e9d27c75afd88ad24cd5edccdc76fd2fc3a751'

const FRAX: Contract = {
  chain: 'ethereum',
  address: '0x853d955acef822db058eb8505911ed77f175b99e',
  symbol: 'FRAX',
  decimals: 18,
  coingeckoId: 'frax',
  stable: true,
}

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getPairsContracts(ctx, fraxLendPairRegistry)

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getLendBorrowBalances(...args, FRAX),
  })

  return {
    groups: [{ balances }],
  }
}
