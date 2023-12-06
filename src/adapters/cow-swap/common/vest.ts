import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  swappableBalanceOf: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'swappableBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableNow: {
    inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }],
    name: 'claimableNow',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCowVestingBalance(ctx: BalancesContext, veCOW: Contract): Promise<Balance> {
  const [userBalance, userClaimable] = await Promise.all([
    call({ ctx, target: veCOW.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: veCOW.address, params: [ctx.address], abi: abi.swappableBalanceOf }),
  ])

  return {
    ...veCOW,
    amount: userBalance,
    claimable: userClaimable,
    underlyings: undefined,
    rewards: undefined,
    category: 'vest',
  }
}

export async function getCowRewardBalance(ctx: BalancesContext, rewarder: Contract): Promise<Balance> {
  const pendingReward = await call({ ctx, target: rewarder.address, params: [ctx.address], abi: abi.claimableNow })

  return {
    ...rewarder,
    amount: pendingReward,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }
}
