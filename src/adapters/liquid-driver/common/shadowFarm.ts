import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getShadowChefContracts(
  ctx: BaseContext,
  shadowChefAddresses: `0x${string}`[],
): Promise<Contract[]> {
  const [stakingTokens, rewardTokens] = await Promise.all([
    multicall({ ctx, calls: shadowChefAddresses.map((address) => ({ target: address }) as const), abi: abi.lpToken }),
    multicall({
      ctx,
      calls: shadowChefAddresses.map((address) => ({ target: address }) as const),
      abi: abi.rewardToken,
    }),
  ])

  const pools = mapMultiSuccessFilter(
    stakingTokens.map((_, i) => [stakingTokens[i], rewardTokens[i]]),

    (res, index) => {
      const address = shadowChefAddresses[index]
      const [{ output: token }, { output: reward }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address,
        token,
        rewards: [reward],
      }
    },
  )

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}
