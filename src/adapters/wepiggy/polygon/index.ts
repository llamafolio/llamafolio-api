import { Contract, GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { Token } from '@lib/token'

import { getMarketsRewards } from '../common/rewards'

const WPC: Token = {
  chain: 'polygon',
  address: '0x6f620ec89b8479e97a6985792d0c64f237566746',
  decimals: 18,
  symbol: 'WPC',
}

const piggyDistribution: Contract = {
  name: 'Piggy Distribution',
  chain: 'polygon',
  address: '0x16b321C99Ab31A84D565ea484F035693718c3E71',
  underlyings: [WPC],
}

const comptroller: Contract = {
  name: 'Wepiggy Comptroller',
  chain: 'polygon',
  address: '0xFfceAcfD39117030314A07b2C86dA36E51787948',
}

export const getContracts = async () => {
  const poolsMarkets = await getMarketsContracts('polygon', {
    // WePiggy Unitroller on Polygon chain
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // pMATIC -> wMATIC
      '0xc1b02e52e9512519edf99671931772e452fb4399': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
  })

  return {
    contracts: {
      poolsMarkets,
      piggyDistribution,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { poolsMarkets, piggyDistribution },
) => {
  const [marketsBalances, marketsRewards] = await Promise.all([
    getMarketsBalances(ctx, 'polygon', poolsMarkets || []),
    getMarketsRewards(ctx, 'polygon', piggyDistribution),
  ])

  const balances = [...marketsBalances, ...marketsRewards]

  return {
    balances,
  }
}
