import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLyraStakeBalances } from '../common/stake'

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xcb9f85730f57732fc899fb158164b9ed60c77d49',
    decimals: 18,
    underlyings: ['0x01ba67aac7f75f647d94220cc98fb30fcc5105bf'],
    symbol: 'stkLYRA',
    rewards: ['0x01BA67AAC7f75f647D94220Cc98FB30FCc5105Bf'],
  },
  {
    chain: 'ethereum',
    address: '0x54d59c4596c7ea66fd62188ba1e16db39e6f5472',
    decimals: 18,
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    symbol: 'stkUSDC',
    rewards: ['0x01BA67AAC7f75f647D94220Cc98FB30FCc5105Bf'],
  },
  {
    chain: 'ethereum',
    address: '0xb9619d73c08076bc5d4f0470593e98b9eb19a219',
    decimals: 18,
    underlyings: ['0x01ba67aac7f75f647d94220cc98fb30fcc5105bf'],
    symbol: 'stkLYRA',
    rewards: ['0x01ba67aac7f75f647d94220cc98fb30fcc5105bf'],
  },
]

export const getContracts = () => {
  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getLyraStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
