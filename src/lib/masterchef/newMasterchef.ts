import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

export const MASTERCHEF_ABI = {
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
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accSushiPerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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

interface GetPoolsContractsProps {
  masterChefAddress: `0x${string}`
  getAllPoolLength?: (ctx: BaseContext, masterchefAddress: `0x${string}`) => Promise<any>
  getPoolInfos?: (ctx: BaseContext, params: GetPoolsInfosParams) => Promise<any>
  getLpToken?: (params: GetLpTokenParams) => Promise<any>
}

export interface GetPoolsInfosParams {
  masterChefAddress: `0x${string}`
  poolLength: bigint
}

interface GetLpTokenParams {
  lpToken: any
}

export async function getMasterChefPoolsContracts(
  ctx: BaseContext,
  options: GetPoolsContractsProps,
): Promise<Contract[]> {
  const _getAllPoolLength = options.getAllPoolLength || getAllPoolLength
  const _getPoolInfos = options.getPoolInfos || getPoolInfos
  const _getLpToken = options.getLpToken || getLpToken

  const poolLength = await _getAllPoolLength(ctx, options.masterChefAddress)
  const poolInfosRes = await _getPoolInfos(ctx, { masterChefAddress: options.masterChefAddress, poolLength })

  const pools = mapSuccessFilter(poolInfosRes, (res) => {
    const lpToken = Array.isArray(res.output) ? _getLpToken({ lpToken: res.output }) : res.output

    return {
      chain: ctx.chain,
      address: lpToken,
      pid: res.input.params![0],
    }
  })

  return getPairsDetails(ctx, pools)
}

export async function getAllPoolLength(ctx: BaseContext, masterChefAddress: `0x${string}`) {
  return call({ ctx, target: masterChefAddress, abi: MASTERCHEF_ABI.poolLength })
}

export async function getPoolInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  return multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: MASTERCHEF_ABI.poolInfo,
  })
}

function getLpToken({ lpToken }: GetLpTokenParams) {
  return lpToken[0]
}

interface GetPoolsBalancesProps {
  masterChefAddress: `0x${string}`
  rewardToken?: Contract
  getUserInfos?: (ctx: BaseContext, params: GetUsersInfosParams) => Promise<any>
  getUserPendingRewards?: (ctx: BaseContext, params: GetUsersInfosParams) => Promise<any>
}

interface GetUsersInfosParams {
  masterChefAddress: `0x${string}`
  pools: Contract[]
}

export async function getMasterChefPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  options: GetPoolsBalancesProps,
) {
  const masterchef = options.masterChefAddress
  const _getUserInfos = options.getUserInfos || getUserInfos
  const _getUserPendingRewards = options.getUserPendingRewards || getUserPendingRewards

  const [userInfoRes, userPendingRewards] = await Promise.all([
    _getUserInfos(ctx, { masterChefAddress: masterchef, pools }),
    _getUserPendingRewards(ctx, { masterChefAddress: masterchef, pools }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userInfoRes.map((_: any, i: number) => [userInfoRes[i], userPendingRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlyings = pool.underlyings as Contract[]
      const reward = options.rewardToken || (pool.rewards?.[0] as Contract)
      const [{ output: userBalance }, { output: pendingReward }] = res.inputOutputPairs

      return {
        ...pool,
        amount: userBalance[0],
        underlyings,
        rewards: [{ ...reward, amount: pendingReward }],
        category: 'farm',
      }
    },
  )

  return getUnderlyingBalances(ctx, poolBalances)
}

export async function getUserInfos(ctx: BalancesContext, { masterChefAddress, pools }: GetUsersInfosParams) {
  return multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: MASTERCHEF_ABI.userInfo,
  })
}

export async function getUserPendingRewards(ctx: BalancesContext, { masterChefAddress, pools }: GetUsersInfosParams) {
  return multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: MASTERCHEF_ABI.pendingReward,
  })
}
