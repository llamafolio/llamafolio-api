import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
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

const CRV: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978', decimals: 18, symbol: 'CRV' },
  avalanche: { chain: 'avalanche', address: '0x249848beca43ac405b8102ec90dd5f22ca513c06', decimals: 18, symbol: 'CRV' },
  base: { chain: 'base', address: '0x8ee73c484a26e0a5df2ee2a4960b789967dd0415', decimals: 18, symbol: 'CRV' },
  ethereum: { chain: 'ethereum', address: '0xd533a949740bb3306d119cc777fa900ba034cd52', decimals: 18, symbol: 'CRV' },
  fantom: { chain: 'fantom', address: '0x1E4F97b9f9F913c46F1632781732927B9019C68b', decimals: 18, symbol: 'CRV' },
  gnosis: { chain: 'gnosis', address: '0x712b3d230f3c1c19db860d80619288b1f0bdd0bd', decimals: 18, symbol: 'CRV' },
  moonbeam: { chain: 'moonbeam', address: '0x7c598c96d02398d89fbcb9d41eab3df0c16f227d', decimals: 18, symbol: 'CRV' },
  optimism: { chain: 'optimism', address: '0x0994206dfe8de6ec6920ff4d779b0d950605fb53', decimals: 18, symbol: 'CRV' },
  polygon: { chain: 'polygon', address: '0x172370d5cd63279efa6d502dab29171933a610af', decimals: 18, symbol: 'CRV' },
}

export async function getGaugesBalances(ctx: BalancesContext, rawPools: Contract[]): Promise<Balance[]> {
  const pools = rawPools.filter((pool) => pool.gauge !== undefined)

  const [userBalancesRes, userRewardsRes, userExtraRewardsRes] = await Promise.all([
    fetchUserBalances(ctx, pools),
    fetchUserRewards(ctx, pools),
    fetchExtraUserRewards(ctx, pools),
  ])

  const poolBalances = processBalances(ctx, pools, userBalancesRes, userRewardsRes, userExtraRewardsRes)
  return getCurveUnderlyingsBalances(ctx, poolBalances)
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
  ctx: BalancesContext,
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

      const rewards = processRewards(ctx, pool, userReward, extraRewardsRes)
      return { ...(pool as Balance), amount: userBalance, rewards, category: 'farm' as Category }
    },
  ).filter(isNotNullish)
}

function processRewards(ctx: BalancesContext, pool: Contract, userRewardRes: any, extraRewardsRes: any[]): Balance[] {
  const crvReward: Balance = { ...(CRV[ctx.chain] as Balance), amount: userRewardRes }
  const rawRewards: Balance[] = (pool.rewards as Balance[]) || []

  const processedExtraRewards = rawRewards.map((reward, index) => {
    const extraRewardOutput = extraRewardsRes[index]?.[0]?.success ? extraRewardsRes[index][0].output : 0n
    return { ...reward, amount: extraRewardOutput }
  })

  return [crvReward, ...processedExtraRewards]
}
