import { getAllUnitusMarkets, getUnitusMarketsInfos } from '@adapters/unitus/common/lend'
import { getUnitusStakers } from '@adapters/unitus/common/staker'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const comptroller: Contract = {
  chain: 'polygon',
  address: '0x52eaCd19E38D501D006D2023C813d7E37F025f37',
}

export const getContracts = async (ctx: BaseContext) => {
  const [stakers, markets] = await Promise.all([
    getUnitusStakers(ctx, stakersAddresses),
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      getAllMarkets: getAllUnitusMarkets,
      getMarketsInfos: getUnitusMarketsInfos,
    }),
  ])

  return {
    contracts: { markets },
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
