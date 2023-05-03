import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

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
}

export async function getPieDaoLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const now = Date.now() / 1000

  const { output: getLocksOfLength } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.getLocksOfLength,
  })

  const locksOfRes = await multicall({
    ctx,
    calls: range(0, getLocksOfLength).map((_, idx) => ({ target: locker.address, params: [ctx.address, idx] })),
    abi: abi.locksOf,
  })

  const test: LockBalance[] = mapSuccessFilter(locksOfRes, (res) => {
    const { lockedAt, lockDuration, amount } = res.output

    const unlockAt = parseInt(lockedAt) + parseInt(lockDuration)
    const isClaimable = now > unlockAt

    return {
      ...locker,
      amount: BigNumber.from(amount),
      underlyings: undefined,
      rewards: undefined,
      claimable: isClaimable ? BigNumber.from(amount) : BN_ZERO,
      unlockAt,
      category: 'lock',
    }
  })

  return test
}
