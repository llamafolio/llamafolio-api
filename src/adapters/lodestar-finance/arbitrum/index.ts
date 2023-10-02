import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
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

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // lETH -> WETH
      '0x7a472988bd094a09f045120e78bb0cea44558b52': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    },
  })

  return {
    contracts: { markets, comptroller, vester, farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    vester: getVestBalances,
    farmer: getFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
