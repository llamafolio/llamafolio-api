import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  stake: {
    inputs: [],
    name: 'stake',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getScaleContracts(ctx: BaseContext, poolsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [stakeTokens, rewardTokens] = await Promise.all([
    multicall({
      ctx,
      calls: poolsAddresses.map((pool) => ({ target: pool }) as const),
      abi: abi.stake,
    }),
    multicall({
      ctx,
      calls: poolsAddresses.map((pool) => ({ target: pool, params: [0n] }) as const),
      abi: abi.rewardTokens,
    }),
  ])

  const pools: Contract[] = mapMultiSuccessFilter(
    stakeTokens.map((_, i) => [stakeTokens[i], rewardTokens[i]]),

    (res, index) => {
      const poolAddress = poolsAddresses[index]
      const [{ output: token }, { output: reward }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: poolAddress,
        token,
        rewards: [reward],
      }
    },
  )

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}
