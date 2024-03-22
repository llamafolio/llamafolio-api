import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares_', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFluidBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userShares = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const poolsBalances: Balance[] = mapSuccessFilter(userShares, (res, index) => ({
    ...pools[index],
    amount: res.output,
  }))

  return getProcessUnderlyings(ctx, poolsBalances)
}

export async function getFluidFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, userRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings![0] as Contract
      const reward = pool.rewards![0] as Contract

      if (!underlying || !reward) return null

      const [{ output: amount }, { output: pendingReward }] = res.inputOutputPairs

      return {
        ...pool,
        amount,
        underlyings: [underlying],
        rewards: [{ ...reward, amount: pendingReward }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish)

  return getProcessUnderlyings(ctx, poolBalances)
}

async function getProcessUnderlyings(ctx: BalancesContext, poolBalances: Balance[]): Promise<Balance[]> {
  const userAssets = await multicall({
    ctx,
    calls: poolBalances.map((pool) => ({ target: pool.token ?? pool.address, params: [pool.amount] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(userAssets, (res, index) => {
    return {
      ...poolBalances[index],
      amount: poolBalances[index].amount,
      underlyings: [{ ...(poolBalances[index].underlyings![0] as Contract), amount: res.output }],
      rewards: undefined,
      category: 'farm',
    }
  })
}
