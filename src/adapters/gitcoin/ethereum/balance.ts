import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  stakes: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'stakes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  latestRound: {
    inputs: [],
    name: 'latestRound',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGitCoinBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const roundLength = await call({ ctx, target: staker.address, abi: abi.latestRound })

  const userStakes = await multicall({
    ctx,
    calls: rangeBI(0n, roundLength).map((i) => ({ target: staker.address, params: [i, ctx.address] }) as const),
    abi: abi.stakes,
  })

  return mapSuccessFilter(userStakes, (res) => ({
    ...staker,
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
