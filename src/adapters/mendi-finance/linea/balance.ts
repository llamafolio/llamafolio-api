import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  withdrawal: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'withdrawal',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'releaseTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMendiStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const [userStakes, userPendingWithdraws] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: abi.withdrawal,
    }),
  ])

  const stakeBalances: Balance[] = mapSuccessFilter(userStakes, (res, index) => ({
    ...stakers[index],
    amount: res.output,
    underlyings: stakers[index].underlyings as Contract[],
    rewards: undefined,
    category: 'stake',
  }))

  const pendingUnstakeBalances: Balance[] = mapSuccessFilter(userPendingWithdraws, (res, index) => ({
    ...stakers[index],
    amount: res.output[0],
    underlyings: stakers[index].underlyings as Contract[],
    rewards: undefined,
    category: 'stake',
  }))

  return [...stakeBalances, ...pendingUnstakeBalances]
}
