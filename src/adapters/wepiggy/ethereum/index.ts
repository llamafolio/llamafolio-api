import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

import { getMarketsRewards } from '../common/rewards'

const WPC: Token = {
  chain: 'ethereum',
  address: '0x6f620ec89b8479e97a6985792d0c64f237566746',
  decimals: 18,
  symbol: 'WPC',
}

const piggyDistribution: Contract = {
  name: 'Piggy Distribution',
  chain: 'ethereum',
  address: '0x3e5496E50793E72e6143a15Bed1c2535F0B0b9b0',
  underlyings: [WPC],
}

const comptroller: Contract = {
  name: 'Wepiggy Comptroller',
  chain: 'ethereum',
  address: '0x0C8c1ab017c3C0c8A48dD9F1DB2F59022D190f0b',
}

export const getContracts = async (ctx: BaseContext) => {
  const poolsMarkets = await getMarketsContracts(ctx, {
    // WePiggy Unitroller on ETH chain
    comptrollerAddress: comptroller.address,
    // pETH -> wETH
    underlyingAddressByMarketAddress: {
      '0x27a94869341838d5783368a8503fda5fbcd7987c': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
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
