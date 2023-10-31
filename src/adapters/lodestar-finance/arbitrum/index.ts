import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import type { Token } from '@lib/token'

import { getFarmBalances } from './farm'
import { getVestBalances } from './vester'

const LODE: Token = {
  chain: 'arbitrum',
  address: '0xF19547f9ED24aA66b03c3a552D181Ae334FBb8DB',
  decimals: 18,
  symbol: 'LODE',
}

const farmer: Contract = {
  chain: 'arbitrum',
  address: '0x4ce0c8c8944205c0a134ef37a772ceee327b4c11',
  token: '0xfb36f24872b9c57aa8264e1f9a235405c4d3fc36',
  underlyings: ['0x82af49447d8a07e3bd95bd0d56f35241523fbab1', '0xf19547f9ed24aa66b03c3a552d181ae334fbb8db'],
  rewards: [LODE],
}

const vester: Contract = {
  chain: 'arbitrum',
  address: '0xe2538a84bdc7d34c9ee7f89c835ce78f07d816d5',
}

const comptroller: Contract = {
  chain: 'arbitrum',
  address: '0x92a62f8c4750D7FbDf9ee1dB268D18169235117B',
  underlyings: [LODE],
}
const comptroller_v1: Contract = {
  chain: 'arbitrum',
  address: '0xa86dd95c210dd186fa7639f93e4177e97d057576',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, markets_v1] = await Promise.all([
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // lETH -> WETH
        '0x7a472988bd094a09f045120e78bb0cea44558b52': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      },
    }),
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller_v1.address,
      underlyingAddressByMarketAddress: {
        // lETH -> WETH
        '0x2193c45244AF12C280941281c8aa67dD08be0a64': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      },
    }),
  ])

  return {
    contracts: { markets, markets_v1, vester, farmer },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    markets_v1: getMarketsBalances,
    vester: getVestBalances,
    farmer: getFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
