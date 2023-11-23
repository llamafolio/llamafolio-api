import { getCvxCliffRatio } from '@adapters/convex-finance/ethereum/utils'
import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'lptoken', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      { internalType: 'address', name: 'stash', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  extraRewardsLength: {
    inputs: [],
    name: 'extraRewardsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  extraRewards: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'extraRewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
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
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
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

const CVX: Contract = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

const CRV: Contract = {
  chain: 'ethereum',
  address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
  decimals: 18,
  symbol: 'CRV',
}

export async function getConvexPoolsContracts(ctx: BaseContext, booster: Contract): Promise<Contract[]> {
  const poolLength = await getPoolLength(ctx, booster)
  const pools = await getPoolsInfo(ctx, booster, poolLength)
  const poolsWithExtraRewardsInfo = await getPoolsWithExtraRewards(ctx, pools)

  const { extraRewardspools, commonRewardsPools } = classifyPools(poolsWithExtraRewardsInfo)
  await populateExtraRewards(ctx, extraRewardspools)

  return [...commonRewardsPools, ...extraRewardspools]
}

async function getPoolLength(ctx: BaseContext, booster: Contract): Promise<bigint> {
  return call({ ctx, target: booster.address, abi: abi.poolLength })
}

async function getPoolsInfo(ctx: BaseContext, booster: Contract, poolLength: bigint): Promise<Contract[]> {
  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: booster.address, params: [idx] }) as const),
    abi: abi.poolInfo,
  })

  return mapSuccessFilter(poolInfosRes, poolInfoMapper(ctx))
}

function poolInfoMapper(ctx: BaseContext): (res: any) => Contract {
  return (res) => {
    const [lpToken, _token, _gauge, crvRewards] = res.output
    return {
      chain: ctx.chain,
      address: lpToken,
      token: lpToken,
      gauge: crvRewards,
      pid: res.input.params[0],
    }
  }
}

async function getPoolsWithExtraRewards(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const extraRewardsLengthsRes = await multicall({
    ctx,
    calls: pools.map(({ gauge }) => ({ target: gauge }) as const),
    abi: abi.extraRewardsLength,
  })

  return extraRewardsLengthsRes.map((res, index) => ({
    ...pools[index],
    extraRewardsLength: res.output,
    rewarders: [],
  }))
}

function classifyPools(pools: Contract[]): { extraRewardspools: Contract[]; commonRewardsPools: Contract[] } {
  const extraRewardspools = pools.filter((pool) => pool.extraRewardsLength !== 0n)
  const commonRewardsPools = pools.filter((pool) => pool.extraRewardsLength === 0n)
  return { extraRewardspools, commonRewardsPools }
}

async function populateExtraRewards(_ctx: BaseContext, _extraRewardspools: Contract[]): Promise<void> {}

export async function getConvexGaugesBalances(ctx: BalancesContext, rawPools: Contract[]): Promise<Balance[]> {
  const pools = rawPools.filter((pool) => pool.gauge !== undefined)

  const [userBalancesRes, pendingCommonRewardsRes, userExtraRewardsRes] = await Promise.all([
    fetchUserBalances(ctx, pools),
    fetchUserCRVCVXRewards(ctx, pools),
    fetchExtraUserRewards(ctx, pools),
  ])

  const poolBalances = mapSuccessFilter(userBalancesRes, (res, index) => ({
    ...(rawPools[index] as Balance),
    amount: res.output,
    rewards: [...pendingCommonRewardsRes[index], ...userExtraRewardsRes[index]],
    category: 'stake' as Category,
  }))

  return getCurveUnderlyingsBalances(ctx, poolBalances)
}

async function fetchUserBalances(ctx: BalancesContext, pools: Contract[]) {
  return multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })
}

async function fetchUserCRVCVXRewards(ctx: BalancesContext, pools: Contract[]) {
  const [pendingCRVs, cvxTotalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
    call({
      ctx,
      target: CVX.address,
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapSuccessFilter(pendingCRVs, (res) => {
    const crvRewards = { ...CRV, amount: res.output }
    const cvxRewards = { ...CVX, amount: getCvxCliffRatio(cvxTotalSupply, crvRewards.amount) }

    return [crvRewards, cvxRewards] as any
  })
}

async function fetchExtraUserRewards(ctx: BalancesContext, rawPools: Contract[]) {
  const extraRewardCalls = rawPools.flatMap((pool) =>
    (pool.rewarders || []).map((res: `0x${string}`) => ({ target: res, params: [ctx.address] })),
  )
  const extraRewardsRes = await multicall({ ctx, calls: extraRewardCalls, abi: abi.earned })

  let currentIndex = 0
  return rawPools.map((pool: Contract) => {
    const endIndex = currentIndex + Number(pool.extraRewardsLength)
    const extraRewardsBalances = extraRewardsRes
      .slice(currentIndex, endIndex)
      .map((res) => (res.success ? res.output : undefined))
    currentIndex = endIndex

    const extraRewards = pool.rewards
    if (!extraRewards || !extraRewardsBalances) return []

    return extraRewards.map((extraReward: any, index: number) => {
      const extraRewardsBalance = extraRewardsBalances[index]
      return { ...extraReward, amount: extraRewardsBalance }
    })
  })
}
