import type { BalancesContext } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import { multicall } from '@lib/multicall'

const abi = {
  pendingSake: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSakePendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingSake,
  })

  return mapSuccessFilter(userPendingRewards, (res: any) => {
    return [{ ...rewardToken, amount: res.output }]
  })
}
