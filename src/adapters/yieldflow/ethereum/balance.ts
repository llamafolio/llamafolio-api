import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getYieldFlowBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, userRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const reward = pool.rewards![0] as Contract
      const [{ output: amount }, { output: rewardAmount }] = res.inputOutputPairs

      return {
        ...pool,
        amount,
        underlyings: undefined,
        rewards: [{ ...reward, amount: rewardAmount }],
        category: 'farm',
      }
    },
  )
}
