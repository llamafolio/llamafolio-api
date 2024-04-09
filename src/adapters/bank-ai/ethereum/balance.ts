import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  getLockPeriodEnd: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getLockPeriodEnd',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBankAiLockBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const [userBalance, userLockEnd] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getLockPeriodEnd }),
  ])

  const now = Date.now() / 1000
  const unlockAt = Number(userLockEnd)

  return {
    ...locker,
    amount: userBalance,
    underlyings: undefined,
    claimable: now > unlockAt ? userLockEnd : 0n,
    unlockAt,
    rewards: undefined,
    category: 'lock',
  }
}
