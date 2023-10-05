import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

import { getSonneStakeBalances } from './stake'

const sSonne: Contract = {
  chain: 'optimism',
  address: '0xdc05d85069dc4aba65954008ff99f2d73ff12618',
  decimals: 18,
  symbol: 'sSonne',
  underlyings: ['0x1db2466d9f5e10d7090e7152b68d62703a2245f0'],
}

const Comptroller: Contract = {
  chain: 'optimism',
  address: '0x60CF091cD3f50420d50fD7f707414d0DF4751C58',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // soWETH -> opWETH
      '0xf7B5965f5C117Eb1B5450187c9DcFccc3C317e8E': '0x4200000000000000000000000000000000000006',
    },
  })

  return {
    contracts: { markets, Comptroller, sSonne },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    sSonne: getSonneStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
