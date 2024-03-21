import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getMasterChefPoolsBalances, type GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import { multicall } from '@lib/multicall'

const abi = {
  pendingBTC: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingBTC',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BTC: Contract = {
  chain: 'ethereum',
  address: '0xbD6323A83b613F668687014E8A5852079494fB68',
  decimals: 18,
  symbol: 'BTC',
}

export async function getBlackRockFundMasterChefPoolBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChef: Contract,
): Promise<Balance[]> {
  return getMasterChefPoolsBalances(ctx, pools, {
    masterChefAddress: masterChef.address,
    rewardToken: BTC,
    getUserPendingRewards: getUserPendingBTC,
  })
}

export async function getUserPendingBTC(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingBTC,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return [{ ...reward, amount: res.output }]
  })
}
