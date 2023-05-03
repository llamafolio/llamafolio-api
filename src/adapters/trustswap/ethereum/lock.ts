import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { BigNumber } from 'ethers'

const abi = {
  getUserLocks: {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'getUserLocks',
    outputs: [
      {
        components: [
          { internalType: 'uint16', name: 'multiplier', type: 'uint16' },
          { internalType: 'uint32', name: 'end', type: 'uint32' },
          { internalType: 'uint208', name: 'amount', type: 'uint208' },
        ],
        internalType: 'struct LockedStaking.Lock[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getTrustLockBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []
  const now = Date.now() / 1000

  const { output: userLocksBalancesRes } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.getUserLocks,
  })

  for (let lockIdx = 0; lockIdx < userLocksBalancesRes.length; lockIdx++) {
    const unlockAt = userLocksBalancesRes[lockIdx].end

    balances.push({
      ...locker,
      amount: BigNumber.from(userLocksBalancesRes[lockIdx].amount),
      claimable: now > unlockAt ? BigNumber.from(userLocksBalancesRes[lockIdx].amount) : BN_ZERO,
      unlockAt,
      underlyings: undefined,
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
