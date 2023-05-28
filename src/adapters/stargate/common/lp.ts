import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  totalLiquidity: {
    inputs: [],
    name: 'totalLiquidity',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStargateLPBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfsRes, totalLiquidities, totalSupplies] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.totalLiquidity }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const balanceOfRes = balancesOfsRes[poolIdx]
    const totalLiquidity = totalLiquidities[poolIdx]
    const totalSupply = totalSupplies[poolIdx]

    if (
      !underlyings ||
      !balanceOfRes.success ||
      !totalLiquidity.success ||
      !totalSupply.success ||
      totalSupply.output === 0n
    ) {
      continue
    }

    balances.push({
      ...pool,
      amount: (balanceOfRes.output * totalLiquidity.output) / totalSupply.output,
      underlyings,
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
