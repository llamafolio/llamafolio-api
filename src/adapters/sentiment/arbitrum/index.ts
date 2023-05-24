import { getSentimentStakerBalances } from '@adapters/sentiment/arbitrum/staker'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stakers: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0x0ddb1ea478f8ef0e22c7706d2903a41e94b1299b',
    underlyings: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
  },
  {
    chain: 'arbitrum',
    address: '0x4c8e1656e042a206eef7e8fcff99bac667e4623e',
    underlyings: ['0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'],
  },
  {
    chain: 'arbitrum',
    address: '0x2e9963ae673a885b6bfeda2f80132ce28b784c40',
    underlyings: ['0x17fc002b466eec40dae837fc4be5c67993ddbd6f'],
  },
  {
    chain: 'arbitrum',
    address: '0xb190214d5ebac7755899f2d96e519aa7a5776bec',
    underlyings: ['0x82af49447d8a07e3bd95bd0d56f35241523fbab1'],
  },
  {
    chain: 'arbitrum',
    address: '0x21202227bc15276e40d53889bc83e59c3cccc121',
    underlyings: ['0x912ce59144191c1204e64559fe8253a0e49e6548'],
  },
]

export const getContracts = () => {
  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getSentimentStakerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
