import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  stakingToken: {
    constant: true,
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  rewardsToken: {
    constant: true,
    inputs: [],
    name: 'rewardsToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getYieldFlowPools(ctx: BaseContext, poolAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [stakeTokens, rewardTokens] = await Promise.all([
    multicall({ ctx, calls: poolAddresses.map((pool) => ({ target: pool }) as const), abi: abi.stakingToken }),
    multicall({ ctx, calls: poolAddresses.map((pool) => ({ target: pool }) as const), abi: abi.rewardsToken }),
  ])

  return mapMultiSuccessFilter(
    stakeTokens.map((_, i) => [stakeTokens[i], rewardTokens[i]]),

    (res, index) => {
      const pool = poolAddresses[index]
      const [{ output: token }, { output: reward }] = res.inputOutputPairs
      return { chain: ctx.chain, address: pool, token, rewards: [reward] }
    },
  )
}
