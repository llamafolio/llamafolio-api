import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendBorrowBalances, getLendContracts, getUserHealthFactor } from './balances'

const morphoLens: Contract = {
  chain: 'ethereum',
  address: '0x930f1b46e1d081ec1524efd95752be3ece51ef67',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getLendContracts(ctx, morphoLens)

  return {
    contracts: { morphoLens, markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      markets: (...args) => getLendBorrowBalances(...args, morphoLens),
    }),
    getUserHealthFactor(ctx, morphoLens, contracts.markets || []),
  ])

  return {
    balances,
    healthFactor,
  }
}
