import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async (ctx: BaseContext) => {
  const comptrollerAddress = '0x0f390559f258eb8591c8e31cf0905e97cf36ace2'

  const pools = await getMarketsContracts(ctx, {
    // hundred-finance comptroller on ETH chain
    comptrollerAddress,
    underlyingAddressByMarketAddress: {
      // hETH -> wETH
      '0xfcd8570ad81e6c77b8d252bebeba62ed980bd64d': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })

  return {
    contracts: {
      pools,
    },
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
