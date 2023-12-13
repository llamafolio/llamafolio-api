import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'address', name: 'rewardToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
  stakingToken: {
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAbracadabraFarmContracts(
  ctx: BaseContext,
  farmAddresses: `0x${string}`[],
): Promise<Contract[]> {
  const [tokens, rewardToken0s, rewardToken1s] = await Promise.all([
    multicall({ ctx, calls: farmAddresses.map((address) => ({ target: address }) as const), abi: abi.stakingToken }),
    multicall({
      ctx,
      calls: farmAddresses.map((address) => ({ target: address, params: [0n] }) as const),
      abi: abi.rewardTokens,
    }),
    multicall({
      ctx,
      calls: farmAddresses.map((address) => ({ target: address, params: [1n] }) as const),
      abi: abi.rewardTokens,
    }),
  ])

  return mapMultiSuccessFilter(
    tokens.map((_, i) => [tokens[i], rewardToken0s[i], rewardToken1s[i]]),

    (res, index) => {
      const address = farmAddresses[index]
      const [{ output: token }, { output: reward0 }, { output: reward1 }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address,
        token,
        rewards: [reward0, reward1],
      }
    },
  )
}

export async function getAbracadabraFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, userReward0s, userReward1s] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: pool.address, params: [ctx.address, (pool.rewards![0] as Contract).address] }) as const,
      ),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: pool.address, params: [ctx.address, (pool.rewards![1] as Contract).address] }) as const,
      ),
      abi: abi.earned,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userReward0s[i], userReward1s[i]]),

    (res, index) => {
      const pool = pools[index]
      const [rawReward0, rawReward1] = pool.rewards as Contract[]
      const [{ output: amount }, { output: reward0Balance }, { output: reward1Balance }] = res.inputOutputPairs

      return {
        ...pool,
        amount,
        underlyings: undefined,
        rewards: [
          { ...rawReward0, amount: reward0Balance },
          { ...rawReward1, amount: reward1Balance },
        ],
        category: 'farm',
      }
    },
  )

  return getCurveUnderlyingsBalances(ctx, poolBalances)
}
