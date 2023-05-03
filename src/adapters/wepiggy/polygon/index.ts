import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

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

export const getContracts = async (ctx: BaseContext) => {
  const poolsMarkets = await getMarketsContracts(ctx, {
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

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    poolsMarkets: getMarketsBalances,
    piggyDistribution: getMarketsRewards,
  })

  return {
    groups: [{ balances }],
  }
}
