import { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { BN_ZERO, sumBN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

const OGV: Token = {
  chain: 'ethereum',
  address: '0x9c354503C38481a7A7a51629142963F98eCC12D0',
  symbol: 'OGV',
  decimals: 18,
}

export async function getOriginDollarLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const [lockupsRes, { output: rewardRes }] = await Promise.all([
    multicall({
      ctx,
      // There is no logic function to know in advance number of positions taken by users, as far i could checked, 10 seems to be the maximum positions length found
      calls: range(0, 10).map((_, i) => ({ target: locker.address, params: [ctx.address, i] })),
      abi: abi.lockups,
    }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.previewRewards }),
  ])

  const totalLocked = sumBN(lockupsRes.filter(isSuccess).map((lockup) => lockup.output.amount))

  for (let lockUpIdx = 0; lockUpIdx < lockupsRes.length; lockUpIdx++) {
    const lockupRes = lockupsRes[lockUpIdx]

    if (!isSuccess(lockupRes)) {
      continue
    }

    const now = Date.now() / 1000
    const unlockAt = lockupRes.output.end
    const rewardsAmount = totalLocked && BigNumber.from(rewardRes).mul(lockupRes.output.amount).div(totalLocked)

    balances.push({
      ...locker,
      amount: BigNumber.from(lockupRes.output.amount),
      claimable: now > unlockAt ? BigNumber.from(lockupRes.output.amount) : BN_ZERO,
      unlockAt,
      underlyings: [OGV],
      rewards: [{ ...OGV, amount: rewardsAmount }],
      category: 'lock',
    })
  }

  return balances
}
