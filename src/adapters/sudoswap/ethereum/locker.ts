import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  lockedOldTokenBalance: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lockedOldTokenBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  unlockTimestamp: {
    inputs: [],
    name: 'unlockTimestamp',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSudoLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const [userBalance, unlockTimestamp] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.lockedOldTokenBalance }),
    call({ ctx, target: locker.address, abi: abi.unlockTimestamp }),
  ])

  const now = Date.now() / 1000
  const unlockAt = Number(unlockTimestamp)

  return {
    ...locker,
    amount: userBalance,
    underlyings: undefined,
    claimable: now > unlockAt ? userBalance : 0n,
    unlockAt,
    rewards: undefined,
    category: 'lock',
  }
}
