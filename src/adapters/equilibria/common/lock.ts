import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getActiveLocks: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getActiveLocks',
    outputs: [{ internalType: 'uint256[2][]', name: '', type: 'uint256[2][]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUnlockable: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUnlockable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEqLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance | undefined> {
  const [userBalance, unlockable, pendingReward] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getActiveLocks }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getUnlockable }),
    call({
      ctx,
      target: locker.address,
      params: [ctx.address, (locker.rewards?.[0] as Contract).address],
      abi: abi.earned,
    }),
  ])

  if (!userBalance[0]) return

  const [end, amount] = userBalance[0]
  const unlockAt = Number(end)

  return {
    ...locker,
    amount,
    claimable: unlockable,
    unlockAt,
    underlyings: undefined,
    rewards: [{ ...(locker.rewards?.[0] as Contract), amount: pendingReward }],
    category: 'lock',
  }
}
