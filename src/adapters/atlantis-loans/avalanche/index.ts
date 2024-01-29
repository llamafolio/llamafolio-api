import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const comptroller: Contract = {
  chain: 'avalanche',
  address: '0x8f85ee1c0a96734cb76870106dd9c016db6de09a',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // aWAVAX -> WAVAX
      '0x6bd2154fbc086cb43411966e0e72584196ccd065': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    },
  })

  return {
    contracts: { markets, comptroller },
    revalidate: 60 * 60,
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

                  export const config: AdapterConfig = {
                    startDate: 1662336000,
                  }
                  