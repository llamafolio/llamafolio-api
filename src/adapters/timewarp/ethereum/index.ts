import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getTimeWarpStakeBalances } from '../common/stake'

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x55c825983783c984890ba89f7d7c9575814d83f2',
    token: '0x1d474d4B4A62b0Ad0C819841eB2C74d1c5050524',
    underlyings: ['0x485d17A6f1B8780392d53D64751824253011A260', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
    rewards: ['0x485d17A6f1B8780392d53D64751824253011A260'],
  },
  {
    chain: 'ethereum',
    address: '0xa106dd3bc6c42b3f28616ffab615c7d494eb629d',
    token: '0x485d17A6f1B8780392d53D64751824253011A260',
    rewards: ['0x485d17A6f1B8780392d53D64751824253011A260'],
  },
]

export const getContracts = () => {
  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getTimeWarpStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
