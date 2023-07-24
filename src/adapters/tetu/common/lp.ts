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
  vaultReserve0: {
    inputs: [],
    name: 'vaultReserve0',
    outputs: [
      {
        internalType: 'uint112',
        name: '',
        type: 'uint112',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  vaultReserve1: {
    inputs: [],
    name: 'vaultReserve1',
    outputs: [
      {
        internalType: 'uint112',
        name: '',
        type: 'uint112',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTetuLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, reserve0sRes, reserve1sRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address } as const)),
      abi: abi.vaultReserve0,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address } as const)),
      abi: abi.vaultReserve1,
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
    const userBalanceRes = userBalancesRes[poolIdx]
    const reserve0Res = reserve0sRes[poolIdx]
    const reserve1Res = reserve1sRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (
      !underlyings ||
      !userBalanceRes.success ||
      !reserve0Res.success ||
      !reserve1Res.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    underlyings[0] = { ...underlyings[0], amount: (reserve0Res.output * userBalanceRes.output) / totalSupplyRes.output }
    underlyings[1] = { ...underlyings[1], amount: (reserve1Res.output * userBalanceRes.output) / totalSupplyRes.output }

    balances.push({
      ...pool,
      amount: userBalanceRes.output,
      underlyings: [underlyings[0], underlyings[1]],
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
