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

const COW: Contract = {
  chain: 'ethereum',
  address: '0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB',
  decimals: 18,
  symbol: 'COW',
}

export async function getCowVestingBalance(
  ctx: BalancesContext,
  veCOW: Contract,
  rewarder: Contract,
): Promise<Balance> {
  const [userBalance, userClaimable, pendingRewards] = await Promise.all([
    call({ ctx, target: veCOW.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: veCOW.address, params: [ctx.address], abi: abi.swappableBalanceOf }),
    call({ ctx, target: rewarder.address, params: [ctx.address], abi: abi.claimableNow }),
  ])

  return {
    ...veCOW,
    amount: userBalance,
    claimable: userClaimable,
    underlyings: undefined,
    rewards: [{ ...COW, amount: pendingRewards }],
    category: 'vest',
  }
}
