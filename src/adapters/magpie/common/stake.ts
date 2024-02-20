import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  userInfos: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfos',
    outputs: [
      { internalType: 'uint256', name: 'deposited', type: 'uint256' },
      { internalType: 'uint256', name: 'factor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  claimedMPendle: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'claimedMPendle',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMagpieStaker(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [[deposited], mPendle] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userInfos }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.claimedMPendle }),
  ])

  return {
    ...staker,
    amount: deposited - mPendle,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
