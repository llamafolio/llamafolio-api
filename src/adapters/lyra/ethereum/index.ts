import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLyraStakeBalances } from '../common/stake'
import { getLyraFarmBalances } from './farm'

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

const lyraFarms: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x1a364a7e66b21ed3045b13d3465627f9e9613f07',
    lpToken: '0xE6f375A29cDd3B40fa7aA0932fF510D304D95FA6',
    underlyings: ['0x01BA67AAC7f75f647D94220Cc98FB30FCc5105Bf', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
    rewards: ['0x01BA67AAC7f75f647D94220Cc98FB30FCc5105Bf'],
  },
]

export const getContracts = () => {
  return {
    contracts: { stakers, lyraFarms },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getLyraStakeBalances,
    lyraFarms: getLyraFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
