import { getAllUnitusMarkets, getUnitusMarketsInfos } from '@adapters/unitus/common/lend'
import { getUnitusStakers, getUnitusStakersBalances } from '@adapters/unitus/common/staker'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const stakersAddresses: `0x${string}`[] = ['0xbf7c410364adc0e075cb359a5a34529190f55c81']

const comptroller: Contract = {
  chain: 'arbitrum',
  address: '0x8E7e9eA9023B81457Ae7E6D2a51b003D421E5408',
}

export const getContracts = async (ctx: BaseContext) => {
  const [stakers, markets] = await Promise.all([
    getUnitusStakers(ctx, stakersAddresses),
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // iETH -> ETH
        '0xee338313f022caee84034253174fa562495dcc15': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      },
      getAllMarkets: getAllUnitusMarkets,
      getMarketsInfos: getUnitusMarketsInfos,
    }),
  ])

  return {
    contracts: { markets, stakers },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    stakers: getUnitusStakersBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1702944000,
}
