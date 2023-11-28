import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  balance: {
    inputs: [],
    name: 'balance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type EqBalance = Balance & {
  pool?: `0x${string}`
}

export async function getEqPoolBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const rewardsByPool = pools.map((pool) =>
    pool.rewards!.map(
      (reward) => ({ target: pool.pool, params: [ctx.address, (reward as Contract).address] }) as const,
    ),
  )

  const [userBalances, userPendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.pool, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    Promise.all(
      rewardsByPool.map((rewardCalls) =>
        multicall({
          ctx,
          calls: rewardCalls,
          abi: abi.earned,
        }),
      ),
    ),
  ])

  const poolBalances: EqBalance[] = mapSuccessFilter(userBalances, (res, i) => {
    const pool = pools[i]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]
    const rewardBalances = userPendingRewards[i]

    if (res.output === 0n) return null

    const fmtRewards = rewards.map((reward, index) => {
      const rewardBalance = rewardBalances[index].output ?? 0n

      return { ...reward, amount: rewardBalance }
    })

    return {
      ...pool,
      amount: res.output,
      underlyings,
      rewards: fmtRewards,
      category: 'stake' as Category,
    }
  }).filter(isNotNullish)

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.address! })
}

export async function getSingleEqBalance(ctx: BalancesContext, pool: Contract): Promise<Balance> {
  const [userBalance, pendingRewards] = await Promise.all([
    call({ ctx, target: pool.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    multicall({
      ctx,
      calls: pool.rewards!.map(
        (reward) => ({ target: pool.address, params: [ctx.address, (reward as Contract).address] }) as const,
      ),
      abi: abi.earned,
    }),
  ])

  const rewards = pool.rewards as Contract[]

  rewards.forEach((reward, index) => {
    const pendingReward = pendingRewards[index].success ? pendingRewards[index].output : 0n
    reward.amount = pendingReward
  })

  return {
    ...pool,
    amount: userBalance,
    underlyings: undefined,
    rewards: rewards as Balance[],
    category: 'stake',
  }
}

export async function getStkEqBalance(ctx: BalancesContext, pool: Contract): Promise<Balance> {
  const [userBalance, tokenBalance, totalSupply] = await Promise.all([
    call({ ctx, target: pool.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: pool.address, abi: abi.balance }),
    call({ ctx, target: pool.address, abi: erc20Abi.totalSupply }),
  ])

  return {
    ...pool,
    amount: (userBalance * tokenBalance) / totalSupply,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
