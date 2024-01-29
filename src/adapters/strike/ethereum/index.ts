import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getMarketsContracts(ctx, {
    // Strike comptroller
    comptrollerAddress: '0xe2e17b2cbbf48211fa7eb8a875360e5e39ba2602',
    underlyingAddressByMarketAddress: {
      // sETH -> WETH
      '0xbee9cf658702527b0acb2719c1faa29edc006a92': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1638835200,
                  }
                  