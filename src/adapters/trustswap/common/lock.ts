import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'

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
} as const

export async function getTrustLockBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []
  const now = Date.now() / 1000

  const userLocksBalancesRes = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.getUserLocks,
  })

  for (let lockIdx = 0; lockIdx < userLocksBalancesRes.length; lockIdx++) {
    const unlockAt = userLocksBalancesRes[lockIdx].end

    balances.push({
      ...locker,
      amount: userLocksBalancesRes[lockIdx].amount,
      claimable: now > unlockAt ? userLocksBalancesRes[lockIdx].amount : 0n,
      unlockAt,
      underlyings: undefined,
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
