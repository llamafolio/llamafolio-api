import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getMasterChefPoolsBalances, type GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardLockedUp', type: 'uint256' },
      { internalType: 'uint256', name: 'nextHarvestUntil', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingTokens: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'address[]', name: 'addresses', type: 'address[]' },
      { internalType: 'string[]', name: 'symbols', type: 'string[]' },
      { internalType: 'uint256[]', name: 'decimals', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ALB: Token = {
  chain: 'base',
  address: '0x1dd2d631c92b1acdfcdd51a0f7145a50130050c4',
  decimals: 18,
  symbol: 'ALB',
}

export async function getAlienFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterchef: Contract,
): Promise<Balance[]> {
  return getMasterChefPoolsBalances(ctx, pools, {
    masterChefAddress: masterchef.address,
    rewardToken: ALB,
    getUserPendingRewards: (...args) => getUserPendingRewards(...args),
  })
}

async function getUserPendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map(({ pid }) => ({ target: masterChefAddress, params: [pid, ctx.address] }) as const),
    abi: abi.pendingTokens,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return [{ ...reward, amount: res.output[3][0] }]
  })
}
