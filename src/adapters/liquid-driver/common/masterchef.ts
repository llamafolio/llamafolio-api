import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import type { GetResolvedUnderlyingsParams, GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import type { GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  pendingLqdr: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingLqdr',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingLqdr2: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingLqdr',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLQDRPoolsInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.lpToken,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    if (res.output === '0x0000000000000000000000000000000000000001') return null
    const lpToken = res.output
    return { chain: ctx.chain, address: lpToken, pid: res.input.params![0] }
  }).filter(isNotNullish)
}

export async function getUserPendingLQDR(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingLqdr,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)
    return [{ ...reward, amount: res.output }]
  })
}

export async function getResolvedLiquidUnderlyings(
  ctx: BalancesContext,
  { pools }: GetResolvedUnderlyingsParams,
): Promise<Contract[]> {
  const nonZeroPools = pools.filter((pool) => pool.amount > 0n)
  const fmtPools = await getUnderlyingBalances(ctx, nonZeroPools)
  return getCurveUnderlyingsBalances(ctx, fmtPools)
}
