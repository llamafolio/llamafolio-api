import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import type { Token } from '@lib/token'

import { getMarketsRewards } from '../common/rewards'

const WPC: Token = {
  chain: 'arbitrum',
  address: '0x6f620ec89b8479e97a6985792d0c64f237566746',
  decimals: 18,
  symbol: 'WPC',
}

const piggyDistribution: Contract = {
  name: 'Piggy Distribution',
  chain: 'arbitrum',
  address: '0x77401FF895BDe043d40aae58F98de5698682c12a',
  underlyings: [WPC],
}

const comptroller: Contract = {
  name: 'Wepiggy Comptroller',
  chain: 'arbitrum',
  address: '0xaa87715E858b482931eB2f6f92E504571588390b',
}

export const getContracts = async (ctx: BaseContext) => {
  const poolsMarkets = await getMarketsContracts(ctx, {
    // WePiggy Unitroller on Arbitrum chain
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // pETH -> wETH
      '0x17933112e9780abd0f27f2b7d9dda9e840d43159': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      // pBTC -> wBTC
      '0x3393cd223f59f32cc0cc845de938472595ca48a1': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    },
  })

  return {
    contracts: {
      poolsMarkets,
      piggyDistribution,
    },
    revalidate: 60 * 60,
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
