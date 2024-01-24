import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

import { abi as erc20Abi } from '@/lib/erc20'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: '_rewardsToken', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getScaleFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, userPendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: pool.address, params: [(pool.rewards![0] as Contract).address, ctx.address] }) as const,
      ),
      abi: abi.earned,
    }),
  ])

  const poolBalances: Balance[] = mapSuccessFilter(userBalances, (res, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings as Contract[]
    const reward = pool.rewards![0] as Contract
    const userReward: any = userPendingRewards[index].success ? userPendingRewards[index].output : 0n

    return {
      ...pools[index],
      amount: res.output,
      underlyings,
      rewards: [{ ...reward, amount: userReward }],
      category: 'farm',
    }
  })

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
