import type { BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import { multicall } from '@lib/multicall'

const abi = {
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingMeerkat',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUserPendingFORT(
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
