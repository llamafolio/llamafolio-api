import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const Comptroller: Contract = {
  chain: 'avalanche',
  address: '0x8f85ee1c0a96734cb76870106dd9c016db6de09a',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // aWAVAX -> WAVAX
      '0x6bd2154fbc086cb43411966e0e72584196ccd065': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    },
  })

  return {
    contracts: { markets, Comptroller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
