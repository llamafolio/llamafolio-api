import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getTimeWarpStakeBalances } from '../common/stake'

const stakers: Contract[] = [
  {
    chain: 'bsc',
    address: '0xc48467ba55cf0b777978f19701329c87949efd3c',
    token: '0xa5ebd19961cf4b8af06a9d9d2b91d73b48744867',
    underlyings: ['0x3b198e26e473b8fab2085b37978e36c9de5d7f68', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'],
    rewards: ['0x3b198e26e473b8fab2085b37978e36c9de5d7f68'],
  },
  {
    chain: 'bsc',
    address: '0x59f2757ae3a1baa21e4f397a28985ceb431c676b',
    token: '0x3b198e26e473b8fab2085b37978e36c9de5d7f68',
    rewards: ['0x3b198e26e473b8fab2085b37978e36c9de5d7f68'],
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
