import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO, sumBN } from '@lib/math'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  lockedBalances: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'lockedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockable', type: 'uint256' },
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      {
        components: [
          { internalType: 'uint224', name: 'amount', type: 'uint224' },
          { internalType: 'uint32', name: 'unlockTime', type: 'uint32' },
        ],
        internalType: 'struct RLBTRFLY.LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const BTRFLY_v2: Token = {
  chain: 'ethereum',
  address: '0xc55126051B22eBb829D00368f4B12Bde432de5Da',
  decimals: 18,
  symbol: 'BTRFLY',
}

export async function getRedactedLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const { output: lockedBalances } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.lockedBalances,
  })

  const locked = sumBN((lockedBalances.lockData || []).map((lockData: any) => lockData.amount))
  const expiredLocked = BigNumber.from(lockedBalances.total).sub(locked)

  balances.push({
    ...locker,
    underlyings: [BTRFLY_v2],
    rewards: undefined,
    amount: expiredLocked,
    claimable: expiredLocked,
    category: 'lock',
  })

  for (let lockIdx = 0; lockIdx < lockedBalances.lockData.length; lockIdx++) {
    const lockedBalance = lockedBalances.lockData[lockIdx]
    const { amount, unlockTime } = lockedBalance

    balances.push({
      ...locker,
      underlyings: [BTRFLY_v2],
      rewards: undefined,
      amount: BigNumber.from(amount),
      unlockAt: unlockTime,
      claimable: BN_ZERO,
      category: 'lock',
    })
  }

  return balances
}
