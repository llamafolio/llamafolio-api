import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

const abi = {
  totalStaked: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'totalStaked',
    outputs: [{ internalType: 'uint256', name: 'total', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalExpectedRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'totalExpectedRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const OGN: Token = {
  chain: 'ethereum',
  address: '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
  decimals: 18,
  symbol: 'OGN',
}

export async function getOriginStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userTotalStakeBalance, pendingReward] = await Promise.all([
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: abi.totalStaked,
    }),
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: abi.totalExpectedRewards,
    }),
  ])

  return {
    ...staker,
    amount: userTotalStakeBalance,
    underlyings: undefined,
    rewards: [{ ...OGN, amount: pendingReward }],
    category: 'stake',
  }
}
