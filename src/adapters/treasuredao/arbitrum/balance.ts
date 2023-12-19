import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  pendingRewardsAll: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingRewardsAll',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserGlobalDeposit: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'getUserGlobalDeposit',
    outputs: [
      { internalType: 'uint256', name: 'globalDepositAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'globalLockLpAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'globalLpAmount', type: 'uint256' },
      { internalType: 'int256', name: 'globalRewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getAllUserDepositIds: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getAllUserDepositIds',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'originalDepositAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'depositAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'lpAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'lockedUntil', type: 'uint256' },
      { internalType: 'uint256', name: 'vestingLastUpdate', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
      { internalType: 'enum AtlasMine.Lock', name: 'lock', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTreasureBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userDeposit, userRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.getUserGlobalDeposit,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.pendingRewardsAll,
    }),
  ])

  return mapMultiSuccessFilter(
    userDeposit.map((_, i) => [userDeposit[i], userRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const rawReward = pool.rewards![0] as Contract
      const [{ output: deposit }, { output: rewardBalance }] = res.inputOutputPairs

      return {
        ...pool,
        amount: deposit[0],
        underlyings: undefined,
        rewards: [{ ...rawReward, amount: rewardBalance }],
        category: 'stake',
      }
    },
  )
}

export async function getBridgeTreasureBalances(ctx: BalancesContext, pool: Contract): Promise<Balance[]> {
  const userIds = await call({ ctx, target: pool.address, params: [ctx.address], abi: abi.getAllUserDepositIds })
  const userDeposits = await multicall({
    ctx,
    calls: userIds.map((id) => ({ target: pool.address, params: [ctx.address, id] }) as const),
    abi: abi.userInfo,
  })

  return mapSuccessFilter(userDeposits, (res) => ({
    ...pool,
    amount: res.output[1],
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
