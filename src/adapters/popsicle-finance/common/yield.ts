import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  usersAmounts: {
    inputs: [],
    name: 'usersAmounts',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPopsicleYieldBalances(ctx: BalancesContext, pairs: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfsRes, tokensAmounts, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address })),
      abi: abi.usersAmounts,
    }),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: pair.address })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
    const pair = pairs[pairIdx]
    const underlyings = pair.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[pairIdx]
    const tokensAmount = tokensAmounts[pairIdx]
    const totalSupplyRes = totalSuppliesRes[pairIdx]

    if (
      !underlyings ||
      !balancesOfRes.success ||
      !tokensAmount.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const updateUnderlyings = underlyings.map((underlying, idx) => ({
      ...underlying,
      amount: (balancesOfRes.output * tokensAmount.output[idx]) / totalSupplyRes.output,
    }))

    balances.push({
      ...pair,
      amount: balancesOfRes.output,
      underlyings: updateUnderlyings,
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}
