import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getReserves: {
    inputs: [],
    name: 'getReserves',
    outputs: [
      {
        internalType: 'uint112',
        name: '_reserve0',
        type: 'uint112',
      },
      {
        internalType: 'uint112',
        name: '_reserve1',
        type: 'uint112',
      },
      {
        internalType: 'uint32',
        name: '_blockTimestampLast',
        type: 'uint32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTetuLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesRes, reservesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address } as const)),
      abi: abi.getReserves,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address } as const)),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const balanceRes = balancesRes[poolIdx]
    const reserveRes = reservesRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (
      !balanceRes.success ||
      !reserveRes.success ||
      !totalSupplyRes.success ||
      !underlyings ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const [reserve0, reserve1] = reserveRes.output

    underlyings[0].amount = (reserve0 * balanceRes.output) / totalSupplyRes.output
    underlyings[1].amount = (reserve1 * balanceRes.output) / totalSupplyRes.output

    balances.push({
      ...pool,
      amount: balanceRes.output,
      underlyings: [underlyings[0], underlyings[1]],
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
