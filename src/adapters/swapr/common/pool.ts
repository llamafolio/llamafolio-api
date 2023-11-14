import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  distributions: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'distributions',
    outputs: [{ internalType: 'contract IERC20StakingRewardsDistribution', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDistributionsAmount: {
    inputs: [],
    name: 'getDistributionsAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getRewardTokens: {
    inputs: [],
    name: 'getRewardTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakableToken: {
    inputs: [],
    name: 'stakableToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSwaprPools(ctx: BaseContext, factory: Contract) {
  const poolLength = await call({ ctx, target: factory.address, abi: abi.getDistributionsAmount })

  const poolAddresses = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((i) => ({ target: factory.address, params: [i] }) as const),
    abi: abi.distributions,
  })

  const [stakableTokenRes, rewardTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(poolAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.stakableToken,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(poolAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.getRewardTokens,
    }),
  ])

  const pools = mapMultiSuccessFilter(
    poolAddresses.map((_, i) => [poolAddresses[i], stakableTokenRes[i], rewardTokensRes[i]]),

    (res) => {
      const [{ output: address }, { output: token }, { output: rewards }] = res.inputOutputPairs
      return { chain: ctx.chain, address, token, rewards }
    },
  )

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token })
}
