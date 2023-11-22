import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { getUnderlyingsPoolsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  claimable_reward: {
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'claimable_tokens',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3038676,
  },
  claimable_extra_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_reward_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 20255,
  },
} as const

const CRV: Contract = {
  chain: 'ethereum',
  address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
  decimals: 18,
  symbol: 'CRV',
}

export async function getGaugesBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, userRewardsRes, userExtraRewardsRes] = await Promise.all([
    fetchUserBalances(ctx, pools),
    fetchUserRewards(ctx, pools),
    fetchExtraUserRewards(ctx, pools),
  ])

  const poolBalances = processBalances(pools, userBalancesRes, userRewardsRes, userExtraRewardsRes)
  return getUnderlyingsPoolsBalances(ctx, poolBalances)
}

async function fetchUserBalances(ctx: BalancesContext, pools: Contract[]) {
  return multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })
}

async function fetchUserRewards(ctx: BalancesContext, pools: Contract[]) {
  return multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
    abi: abi.claimable_reward,
  })
}

async function fetchExtraUserRewards(ctx: BalancesContext, pools: Contract[]) {
  return Promise.all(
    pools.map((pool) =>
      Promise.all(
        (pool.rewards || []).map(({ address }: any) =>
          multicall({
            ctx,
            calls: [{ target: pool.gauge, params: [ctx.address, address] }],
            abi: abi.claimable_extra_reward,
          }),
        ),
      ),
    ),
  )
}

export function processBalances(
  pools: Contract[],
  userBalancesRes: any[],
  userRewardsRes: any[],
  userExtraRewardsRes: any[],
): Balance[] {
  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], userRewardsRes[i]]),

    (res, index) => {
      const pool = pools[index] as Balance
      const extraRewardsRes = userExtraRewardsRes[index]

      const [{ output: userBalance }, { output: userReward }] = res.inputOutputPairs
      if (userBalance === 0n) return null

      const rewards = processRewards(pool, userReward, extraRewardsRes)
      return { ...pool, amount: userBalance, rewards, category: 'farm' as Category }
    },
  ).filter(isNotNullish)
}

function processRewards(pool: Contract, userRewardRes: any, extraRewardsRes: any[]): Balance[] {
  const crvReward: Balance = { ...(CRV as Balance), amount: userRewardRes }
  const rawRewards: Balance[] = (pool.rewards as Balance[]) || []

  const processedExtraRewards = rawRewards.map((reward, index) => {
    const extraRewardOutput = extraRewardsRes[index]?.[0]?.success ? extraRewardsRes[index][0].output : 0n
    return { ...reward, amount: extraRewardOutput }
  })

  return [crvReward, ...processedExtraRewards]
}
