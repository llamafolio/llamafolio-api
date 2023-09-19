import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getPairsBalances, getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getTotalAmounts: {
    inputs: [],
    name: 'getTotalAmounts',
    outputs: [
      { internalType: 'uint256', name: 'total0', type: 'uint256' },
      { internalType: 'uint256', name: 'total1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getThenaBalances(ctx: BalancesContext, pairs: Contract[], reward: Token) {
  return Promise.all([getPairsBalances(ctx, pairs), getGaugesBalances(ctx, pairs, reward)])
}

async function getGaugesBalances(ctx: BalancesContext, pools: Contract[], reward: Token): Promise<Balance[]> {
  const balances: Balance[] = []

  pools = pools.filter((pool) => pool.gauge !== ADDRESS_ZERO)

  const [userBalancesRes, userEarnedsRes, totalSuppliesRes, tokensBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.getTotalAmounts,
    }),
  ])

  for (const [index, pair] of pools.entries()) {
    const userBalanceRes = userBalancesRes[index]
    const userEarnedRes = userEarnedsRes[index]
    const totalSupplyRes = totalSuppliesRes[index].success ? totalSuppliesRes[index].output : 1n
    const tokensBalanceRes = tokensBalancesRes[index].success ? tokensBalancesRes[index].output : [1n, 1n]
    const underlyings = pair.underlyings as Contract[]

    if (!underlyings || !userBalanceRes.success || !userEarnedRes.success) {
      continue
    }

    underlyings.forEach((underlying, idx) => {
      underlying.amount = (userBalanceRes.output * tokensBalanceRes![idx]) / totalSupplyRes!
    })

    balances.push({
      ...pair,
      amount: userBalanceRes.output,
      underlyings,
      rewards: [{ ...reward, amount: userEarnedRes.output }],
      category: 'farm',
    })
  }

  const oldBalances = balances.filter(
    (balance) => balance.amount !== 0n && balance.underlyings!.some((underlying: any) => underlying.amount === 0n),
  )

  const fmtBalances = await getUnderlyingBalances(ctx, oldBalances)

  for (let i = 0; i < fmtBalances.length; i++) {
    const contractIndex = balances.findIndex((c) => c.address === fmtBalances[i].address)
    if (contractIndex !== -1) {
      balances[contractIndex] = Object.assign({}, balances[contractIndex], fmtBalances[i])
    }
  }
  return balances
}
