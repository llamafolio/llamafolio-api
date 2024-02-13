import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import type { GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import type { GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

const abi = {
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLiquidPoolInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.lpToken,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    return { chain: ctx.chain, address: res.output, pid: res.input.params![0] }
  })
}

export async function getLiquidPendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingReward,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return [{ ...reward, amount: res.output }]
  })
}
