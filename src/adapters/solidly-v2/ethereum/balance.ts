import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getPairsBalances, getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSolidlyBalances(ctx: BalancesContext, pairs: Contract[], reward: Token) {
  return Promise.all([getPairsBalances(ctx, pairs), getGaugesBalances(ctx, pairs, reward)])
}

async function getGaugesBalances(ctx: BalancesContext, pools: Contract[], reward: Token): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, userEarnedsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.gauge, params: [reward.address, ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  for (const [index, pair] of pools.entries()) {
    const userBalanceRes = userBalancesRes[index]
    const userEarnedRes = userEarnedsRes[index]
    const underlyings = pair.underlyings as Contract[]

    if (!underlyings || !userBalanceRes.success || !userEarnedRes.success) {
      continue
    }

    balances.push({
      ...pair,
      amount: userBalanceRes.output,
      underlyings,
      rewards: [{ ...reward, amount: userEarnedRes.output }],
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, balances)
}
