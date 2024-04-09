import { getBobBalances } from '@adapters/bob-fusion/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const allowedTokens: `0x${string}`[] = [
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // BTC
  '0x18084fba666a33d37592fa2633fd49a74dd93a88', // tBTB
  '0xae78736cd615f374d3085123a210448e74fc6393', // rETH
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // WSTETH
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x7122985656e38BDC0302Db86685bb972b145bD3C', // STONE
  '0xbdBb63F938c8961AF31eaD3deBa5C96e6A323DD1', // eDLLR
  '0xbdab72602e9AD40FC6a6852CAf43258113B8F7a5', // eSOV
  '0xe7c3755482d0dA522678Af05945062d4427e0923', // ALEX
]

const staker: Contract = {
  chain: 'ethereum',
  address: '0x61dc14b28d4dbcd6cf887e9b72018b9da1ce6ff7',
  underlyings: allowedTokens,
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getBobBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1711497600,
}
