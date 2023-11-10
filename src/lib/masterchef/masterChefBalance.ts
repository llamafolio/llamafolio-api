import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

export const MASTERCHEF_ABI = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pending',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface GetPoolsBalancesProps {
  masterChefAddress: `0x${string}`
  rewardToken?: Contract
  getUserInfos?: (ctx: BalancesContext, params: GetUsersInfosParams) => Promise<any>
  getUserPendingRewards?: (ctx: BalancesContext, params: GetUsersInfosParams) => Promise<any>
  getUserBalance?: (params: GetUserBalanceParams) => Promise<any>
  getResolvedUnderlyings?: (ctx: BalancesContext, params: GetResolvedUnderlyingsParams) => Promise<any>
}

export interface GetUsersInfosParams {
  masterChefAddress: `0x${string}`
  pools: Contract[]
  rewardToken?: Contract
  getUserBalance?: (params: GetUserBalanceParams) => Promise<any>
}

export interface GetUserBalanceParams {
  userBalance: any
}

export interface GetResolvedUnderlyingsParams {
  pools: Balance[]
}

export async function getMasterChefPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  options: GetPoolsBalancesProps,
) {
  const masterchef = options.masterChefAddress
  const _getUserInfos = options.getUserInfos || getUserInfos
  const _getUserPendingRewards = options.getUserPendingRewards || getUserPendingRewards
  const _getUserBalance = options.getUserBalance || getUserBalance
  const _getResolvedUnderlyings = options.getResolvedUnderlyings || getResolvedUnderlyings

  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    _getUserInfos(ctx, { masterChefAddress: masterchef, pools, getUserBalance: _getUserBalance }),
    _getUserPendingRewards(ctx, { masterChefAddress: masterchef, pools, rewardToken: options.rewardToken }),
  ])

  const poolBalances = userBalancesRes.map((userBalance: Contract, index: number) => {
    const userPendingRewards = userPendingRewardsRes[index]
    if (!userPendingRewards) return { ...userBalance, rewards: undefined }

    return { ...userBalance, rewards: userPendingRewards }
  })

  return _getResolvedUnderlyings(ctx, { pools: poolBalances })
}

export async function getUserInfos(
  ctx: BalancesContext,
  { masterChefAddress, pools, getUserBalance }: GetUsersInfosParams,
) {
  const poolsInfos = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: MASTERCHEF_ABI.userInfo,
  })

  return mapSuccessFilter(poolsInfos, (res: any, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Contract[]
    const userBalance = Array.isArray(res.output) ? getUserBalance!({ userBalance: res.output }) : res.output

    return {
      ...pool,
      amount: userBalance,
      underlyings,
      rewards,
      category: 'farm',
    }
  })
}

function getUserBalance({ userBalance }: GetUserBalanceParams) {
  return userBalance[0]
}

export async function getUserPendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: MASTERCHEF_ABI.pendingReward,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return [{ ...reward, amount: res.output }]
  })
}

async function getResolvedUnderlyings(
  ctx: BalancesContext,
  { pools }: GetResolvedUnderlyingsParams,
): Promise<Contract[]> {
  return getUnderlyingBalances(ctx, pools)
}
