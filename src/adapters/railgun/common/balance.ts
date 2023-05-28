import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  stakes: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'stakes',
    outputs: [
      { internalType: 'address', name: 'delegate', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'staketime', type: 'uint256' },
      { internalType: 'uint256', name: 'locktime', type: 'uint256' },
      { internalType: 'uint256', name: 'claimedTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  stakesLength: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'stakesLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getRailgunBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const userStakeLength = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.stakesLength,
  })

  const userStakesRes = await multicall({
    ctx,
    calls: rangeBI(0n, userStakeLength).map((idx) => ({ target: staker.address, params: [ctx.address, idx] } as const)),
    abi: abi.stakes,
  })

  for (let resIdx = 0; resIdx < userStakesRes.length; resIdx++) {
    const userStakeRes = userStakesRes[resIdx]

    if (!userStakeRes.success) {
      continue
    }

    const [_delegate, amount] = userStakeRes.output

    balances.push({
      ...staker,
      amount: amount,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}
