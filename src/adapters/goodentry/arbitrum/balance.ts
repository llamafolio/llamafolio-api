import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getReserves: {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
      { internalType: 'uint256', name: 'valueX8', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGoodEntryLPs(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, totalSuppliesRes, tokensBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address })),
      abi: abi.getReserves,
    }),
  ])

  for (const [index, pool] of pools.entries()) {
    const underlyings = pool.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[index]
    const totalSupplyRes = totalSuppliesRes[index]
    const tokensBalanceRes = tokensBalancesRes[index]

    if (
      !underlyings ||
      !userBalanceRes.success ||
      !totalSupplyRes.success ||
      !tokensBalanceRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const updatedUnderlyings = underlyings.map((underlying, index) => {
      return { ...underlying, amount: (tokensBalanceRes.output[index] * userBalanceRes.output) / totalSupplyRes.output }
    })

    balances.push({
      ...pool,
      amount: userBalanceRes.output,
      underlyings: updatedUnderlyings,
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
