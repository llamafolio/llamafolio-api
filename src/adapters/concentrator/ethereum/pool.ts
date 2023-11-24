import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import type { GetResolvedUnderlyingsParams, GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import type { GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'uint128', name: 'totalUnderlying', type: 'uint128' },
      { internalType: 'uint128', name: 'totalShare', type: 'uint128' },
      { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'convexPoolId', type: 'uint256' },
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      {
        internalType: 'uint256',
        name: 'withdrawFeePercentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'platformFeePercentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'harvestBountyPercentage',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'pauseDeposit', type: 'bool' },
      { internalType: 'bool', name: 'pauseWithdraw', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfoOld: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      {
        components: [
          { internalType: 'uint128', name: 'totalUnderlying', type: 'uint128' },
          { internalType: 'uint128', name: 'totalShare', type: 'uint128' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolSupplyInfo',
        name: 'supply',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'address', name: 'strategy', type: 'address' },
          { internalType: 'bool', name: 'pauseDeposit', type: 'bool' },
          { internalType: 'bool', name: 'pauseWithdraw', type: 'bool' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolStrategyInfo',
        name: 'strategy',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint128', name: 'rate', type: 'uint128' },
          { internalType: 'uint32', name: 'periodLength', type: 'uint32' },
          { internalType: 'uint48', name: 'lastUpdate', type: 'uint48' },
          { internalType: 'uint48', name: 'finishAt', type: 'uint48' },
          { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolRewardInfo',
        name: 'reward',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint32', name: 'withdrawFeeRatio', type: 'uint32' },
          { internalType: 'uint32', name: 'platformFeeRatio', type: 'uint32' },
          { internalType: 'uint32', name: 'harvestBountyRatio', type: 'uint32' },
          { internalType: 'uint160', name: 'reserved', type: 'uint160' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolFeeInfo',
        name: 'fee',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingCTR: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_account', type: 'address' },
    ],
    name: 'pendingCTR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_account', type: 'address' },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: '_shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getConcentratorPoolInfos(
  ctx: BaseContext,
  { masterChefAddress, poolLength, getLpToken }: GetPoolsInfosParams,
) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.poolInfo,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    const lpToken = Array.isArray(res.output) ? getLpToken!({ lpToken: res.output }) : res.output

    return { chain: ctx.chain, address: lpToken, token: lpToken, pid: res.input.params![0] }
  })
}

export async function getConcentratorOldPoolInfos(
  ctx: BaseContext,
  { masterChefAddress, poolLength, getLpToken }: GetPoolsInfosParams,
) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.poolInfoOld,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    const lpToken = Array.isArray(res.output) ? getLpToken!({ lpToken: res.output }) : res.output

    return { chain: ctx.chain, address: lpToken, token: lpToken, pid: res.input.params![0] }
  })
}

export async function getConcentratorUnderlyings(ctx: BalancesContext, { pools }: GetResolvedUnderlyingsParams) {
  return getCurveUnderlyingsBalances(ctx, pools)
}

export async function getUserPendingaCRV(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingReward,
  })

  const rewards: Contract[] = mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return { ...reward, amount: res.output }
  })

  const convertedBalances = await multicall({
    ctx,
    calls: rewards.map((reward) => ({ target: reward.address, params: [reward.amount] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(convertedBalances, (res, index) => {
    const reward = rewards[index]
    const underlyingsReward = reward.underlyings?.[0] as Contract

    return [{ ...underlyingsReward, amount: res.output }]
  })
}

export async function getUserPendingaFXS(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingReward,
  })

  const rewards: Contract[] = mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return { ...reward, amount: res.output }
  })

  const convertedBalances = await multicall({
    ctx,
    calls: rewards.map((reward) => ({ target: reward.address, params: [reward.amount] }) as const),
    abi: abi.convertToAssets,
  })

  const fmtRewards: any[] = mapSuccessFilter(convertedBalances, (res, index) => {
    const reward = rewards[index]
    const underlyingsReward = reward.underlyings?.[0] as Contract

    return [{ ...underlyingsReward, amount: res.output }]
  })

  return getCurveUnderlyingsBalances(ctx, fmtRewards)
}
