import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { sumBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  lockups: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'lockups',
    outputs: [
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
      { internalType: 'uint128', name: 'end', type: 'uint128' },
      { internalType: 'uint256', name: 'points', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  previewRewards: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'previewRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const OGV: Token = {
  chain: 'ethereum',
  address: '0x9c354503C38481a7A7a51629142963F98eCC12D0',
  symbol: 'OGV',
  decimals: 18,
}

export async function getOriginDollarLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const [lockupsRes, rewardRes] = await Promise.all([
    multicall({
      ctx,
      // There is no logic function to know in advance number of positions taken by users, as far i could checked, 10 seems to be the maximum positions length found
      calls: range(0, 10).map((_, i) => ({ target: locker.address, params: [ctx.address, BigInt(i)] } as const)),
      abi: abi.lockups,
    }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.previewRewards }),
  ])

  const totalLocked = sumBI(mapSuccessFilter(lockupsRes, (lockup) => lockup.output[0]))

  for (let lockUpIdx = 0; lockUpIdx < lockupsRes.length; lockUpIdx++) {
    const lockupRes = lockupsRes[lockUpIdx]

    if (!lockupRes.success) {
      continue
    }

    const [amount, end, _points] = lockupRes.output

    const now = Date.now() / 1000
    const unlockAt = Number(end)
    const rewardsAmount = totalLocked && (rewardRes * amount) / totalLocked

    balances.push({
      ...locker,
      amount: amount,
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      underlyings: [OGV],
      rewards: [{ ...OGV, amount: rewardsAmount }],
      category: 'lock',
    })
  }

  return balances
}
