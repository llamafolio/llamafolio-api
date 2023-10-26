import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const Comptroller: Contract = {
  chain: 'bsc',
  address: '0x67340bd16ee5649a37015138b3393eb5ad17c195',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // fBNB -> WBNB
      '0xe24146585e882b6b59ca9bfaaaffed201e4e5491': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    },
  })

  return {
    contracts: { markets, Comptroller },
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
