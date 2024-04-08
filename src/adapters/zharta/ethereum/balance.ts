import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  computeWithdrawableAmount: {
    stateMutability: 'view',
    type: 'function',
    name: 'computeWithdrawableAmount',
    inputs: [{ name: '_lender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

export async function getZhartaStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const computeWithdrawableAmount = await multicall({
    ctx,
    calls: stakers.map(({ staker }) => ({ target: staker, params: [ctx.address] as const })),
    abi: abi.computeWithdrawableAmount,
  })

  return mapSuccessFilter(computeWithdrawableAmount, (res, index) => ({
    ...stakers[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
