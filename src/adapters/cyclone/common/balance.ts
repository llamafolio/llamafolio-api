import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  userInfo: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCycloneBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, userRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.pendingReward,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userRewards[i]]),

    (res, index) => {
      const pool = pools[index] as Balance
      const reward = pool.rewards![0] as Contract
      const [{ output: userBalance }, { output: rewardAmount }] = res.inputOutputPairs

      return {
        ...pool,
        amount: userBalance[0],
        rewards: [{ ...reward, amount: rewardAmount }],
        category: 'farm',
      }
    },
  )

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
