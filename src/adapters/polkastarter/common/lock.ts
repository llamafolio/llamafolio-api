import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { BigNumber } from 'ethers'

const abi = {
  getUnlockTime: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'getUnlockTime',
    outputs: [{ internalType: 'uint48', name: 'unlockTime', type: 'uint48' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakeAmount: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'stakeAmount',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getEarnedRewardTokens: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'getEarnedRewardTokens',
    outputs: [{ internalType: 'uint256', name: 'claimableRewardTokens', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPolkaLockedBalance(ctx: BalancesContext, locker: Contract): Promise<Balance | undefined> {
  const [userBalance, lockTime] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.stakeAmount }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getUnlockTime }),
  ])

  const now = Date.now() / 1000
  const unlockAt = Number(lockTime)

  return {
    ...locker,
    address: locker.token!,
    amount: BigNumber.from(userBalance),
    claimable: now > unlockAt ? BigNumber.from(userBalance) : BN_ZERO,
    unlockAt,
    underlyings: undefined,
    rewards: undefined,
    category: 'lock',
  }
}
