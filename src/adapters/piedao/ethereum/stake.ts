import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  ethBalanceOf: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'ethBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPieDaoStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] } as const)),
    abi: abi.ethBalanceOf,
  })

  const balances: Balance[] = mapSuccessFilter(userBalances, (res, idx) => ({
    ...stakers[idx],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))

  return balances
}
