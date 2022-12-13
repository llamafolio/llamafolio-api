import { BalancesContext, GetBalancesHandler, GetContractsHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendBorrowBalances } from './lend'
import { getPairsContracts } from './registry'

const fraxLendPairRegistry = '0xd6e9d27c75afd88ad24cd5edccdc76fd2fc3a751'

export const getContracts: GetContractsHandler = async (ctx) => {
  const pairs = await getPairsContracts(ctx, fraxLendPairRegistry)

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    pairs: getLendBorrowBalances,
  })

  return {
    balances,
  }
}
