import { getAllUnitusMarkets, getUnitusMarketsInfos } from '@adapters/unitus/common/lend'
import { getUnitusStakers, getUnitusStakersBalances } from '@adapters/unitus/common/staker'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const stakersAddresses: `0x${string}`[] = ['0x28811dcb2d1755a76678641441b4c9d3ad12be48']

const comptroller: Contract = {
  chain: 'optimism',
  address: '0xa300a84d8970718dac32f54f61bd568142d8bcf4',
}

export const getContracts = async (ctx: BaseContext) => {
  const [stakers, markets] = await Promise.all([
    getUnitusStakers(ctx, stakersAddresses),
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // iETH -> ETH
        '0xa7a084538de04d808f20c785762934dd5da7b3b4': '0x4200000000000000000000000000000000000006',
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
