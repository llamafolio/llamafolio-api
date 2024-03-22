import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakingToken: {
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardsToken: {
    inputs: [],
    name: 'rewardsToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFluidContracts(ctx: BaseContext, poolsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const assets = await multicall({
    ctx,
    calls: poolsAddresses.map((pool) => ({ target: pool }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(assets, (res, index) => {
    return {
      chain: ctx.chain,
      address: poolsAddresses[index],
      underlyings: [res.output],
    }
  })
}

export async function getFluidFarmingContracts(
  ctx: BaseContext,
  farmersAddresses: `0x${string}`[],
): Promise<Contract[]> {
  const [stakingTokens, rewardTokens] = await Promise.all([
    multicall({ ctx, calls: farmersAddresses.map((farmer) => ({ target: farmer }) as const), abi: abi.stakingToken }),
    multicall({ ctx, calls: farmersAddresses.map((farmer) => ({ target: farmer }) as const), abi: abi.rewardsToken }),
  ])

  const assets = await multicall({
    ctx,
    calls: mapSuccessFilter(stakingTokens, (res) => ({ target: res.output }) as const),
    abi: abi.asset,
  })

  return mapMultiSuccessFilter(
    stakingTokens.map((_, i) => [stakingTokens[i], rewardTokens[i], assets[i]]),

    (res, index) => {
      const address = farmersAddresses[index]
      const [{ output: token }, { output: reward }, { output: underlying }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address,
        token,
        underlyings: [underlying],
        rewards: [reward],
      }
    },
  )
}
