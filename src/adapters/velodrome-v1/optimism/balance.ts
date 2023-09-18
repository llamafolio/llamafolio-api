import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
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

const VELO: Token = {
  chain: 'optimism',
  address: '0x3c8B650257cFb5f272f799F5e2b4e65093a11a05',
  decimals: 18,
  symbol: 'VELO',
}

export async function getVelodromeBalances(ctx: BalancesContext, pairs: Contract[]) {
  return Promise.all([getPairsBalances(ctx, pairs), getGaugesBalances(ctx, pairs)])
}

async function getGaugesBalances(ctx: BalancesContext, pairs: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  pairs = pairs.filter((pair) => pair.gauge !== ADDRESS_ZERO)

  const [userBalancesRes, userEarnedsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.gauge, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.gauge, params: [VELO.address, ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  for (const [index, pair] of pairs.entries()) {
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
      rewards: [{ ...VELO, amount: userEarnedRes.output }],
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, balances)
}
