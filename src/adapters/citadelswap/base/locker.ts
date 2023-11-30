import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getUserRedeemLength: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserRedeemLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userLock: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'userLock',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'prevReward', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
      { internalType: 'uint256', name: 'day', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFortLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const userLockLength = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.getUserRedeemLength,
  })

  const userLockedInfos = await multicall({
    ctx,
    calls: rangeBI(0n, userLockLength).map((i) => ({ target: locker.address, params: [ctx.address, i] }) as const),
    abi: abi.userLock,
  })

  return mapSuccessFilter(userLockedInfos, (res) => {
    const [amount, _, unlockTime, __, rewardAmount] = res.output
    const unlockAt = Number(unlockTime)

    return {
      ...locker,
      amount,
      unlockAt,
      claimable: rewardAmount,
      underlyings: undefined,
      rewards: undefined,
      category: 'lock',
    }
  })
}
