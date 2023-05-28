import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getLocksOfLength: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getLocksOfLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  locksOf: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'locksOf',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint32', name: 'lockedAt', type: 'uint32' },
      { internalType: 'uint32', name: 'lockDuration', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPieDaoLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const now = Date.now() / 1000

  const getLocksOfLength = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.getLocksOfLength,
  })

  const locksOfRes = await multicall({
    ctx,
    calls: rangeBI(0n, getLocksOfLength).map(
      (idx) => ({ target: locker.address, params: [ctx.address, idx] } as const),
    ),
    abi: abi.locksOf,
  })

  const test: LockBalance[] = mapSuccessFilter(locksOfRes, (res) => {
    const [amount, lockedAt, lockDuration] = res.output

    const unlockAt = Number(lockedAt + lockDuration)
    const isClaimable = now > unlockAt

    return {
      ...locker,
      amount: amount,
      underlyings: undefined,
      rewards: undefined,
      claimable: isClaimable ? amount : 0n,
      unlockAt,
      category: 'lock',
    }
  })

  return test
}
