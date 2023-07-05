import { getInchRewardBalances } from '@adapters/1inch-network/common/reward'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  depositors: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'depositors',
    outputs: [
      { internalType: 'uint40', name: 'lockTime', type: 'uint40' },
      { internalType: 'uint40', name: 'unlockTime', type: 'uint40' },
      { internalType: 'uint176', name: 'amount', type: 'uint176' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getInchLockerBalances(
  ctx: BalancesContext,
  locker: Contract,
  rewarders: Contract[],
): Promise<Balance> {
  const [[_lockTime, unlockTime, amount], pendingRewards] = await Promise.all([
    call({
      ctx,
      target: locker.address,
      params: [ctx.address],
      abi: abi.depositors,
    }),
    getInchRewardBalances(ctx, rewarders),
  ])

  const fmtpendingRewards = pendingRewards.filter((reward) => reward.amount > 0n)

  return {
    ...locker,
    amount,
    underlyings: locker.underlyings as Contract[],
    unlockAt: unlockTime,
    rewards: fmtpendingRewards,
    category: 'lock',
  }
}
