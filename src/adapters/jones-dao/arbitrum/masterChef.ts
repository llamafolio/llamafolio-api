import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import type { GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import type { GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

const abi = {
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardSecond', type: 'uint256' },
      { internalType: 'uint256', name: 'accJonesPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'currentDeposit', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingJones: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingJones',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getJonesMasterChefPoolInfos(
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

    return { chain: ctx.chain, address: lpToken, pid: res.input.params![0] }
  })
}

export async function getJonesJonesMasterChefPendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingJones,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return [{ ...reward, amount: res.output }]
  })
}
