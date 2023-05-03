import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getX2Y2YieldBalances } from './farm'
import { getX2Y2StakerBalances } from './stake'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xc8c3cc5be962b6d281e4a53dbcce1359f76a1b85',
  token: '0x1E4EDE388cbc9F4b5c79681B7f94d36a11ABEBC9',
  underlyings: ['0x1E4EDE388cbc9F4b5c79681B7f94d36a11ABEBC9'],
  rewards: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xac010690e41fb5c6f9d66cc33bd78c2f8eca9a2f',
  token: '0x1E4EDE388cbc9F4b5c79681B7f94d36a11ABEBC9',
  underlyings: ['0x1E4EDE388cbc9F4b5c79681B7f94d36a11ABEBC9'],
}

export const getContracts = () => {
  return {
    contracts: { staker, farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getX2Y2StakerBalances,
    farmer: getX2Y2YieldBalances,
  })

  return {
    groups: [{ balances }],
  }
}
