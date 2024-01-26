import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  users: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'users',
    outputs: [
      { internalType: 'uint256', name: 'stakedTokens', type: 'uint256' },
      { internalType: 'uint256', name: 'debtUsdc', type: 'uint256' },
      { internalType: 'uint256', name: 'harvestedRewardsUsdc', type: 'uint256' },
      { internalType: 'bytes32', name: '_gap0', type: 'bytes32' },
      { internalType: 'bytes32', name: '_gap1', type: 'bytes32' },
      { internalType: 'bytes32', name: '_gap2', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRewardUsdc: {
    inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
    name: 'pendingRewardUsdc',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDC: Contract = {
  chain: 'arbitrum',
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  decimals: 6,
  symbol: 'USDC',
}

export async function getGambitStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [[userBalance], userReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.users }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.pendingRewardUsdc }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...USDC, amount: userReward }],
    category: 'stake',
  }
}
