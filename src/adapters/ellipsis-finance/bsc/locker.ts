import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  userBalance: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'userBalance',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEllipsisLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const userLockBalance = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.userBalance })

  return {
    ...locker,
    amount: userLockBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'lock',
  }
}
