import type { AdapterConfig } from "@lib/adapter";import { getMarketsContracts } from '@adapters/morpho-aave/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendBorrowBalances, getUserHealthFactor } from './balances'

const lens: Contract = {
  chain: 'ethereum',
  address: '0x507fa343d0a90786d86c7cd885f5c49263a91ff4',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, lens)

  return {
    contracts: { markets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      markets: (...args) => getLendBorrowBalances(...args, lens),
    }),
    getUserHealthFactor(ctx, lens),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1665187200,
                  }
                  