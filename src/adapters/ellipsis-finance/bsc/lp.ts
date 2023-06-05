import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  balanceOf: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3201,
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEllipsisLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesOfsRes, totalSuppliesRes, tokenBalancesOfRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address } as const)), abi: abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        range(0, pool.tokens.length).map((_, idx) => ({ target: pool.pool, params: [BigInt(idx)] } as const)),
      ),
      abi: abi.balances,
    }),
  ])

  let balanceOfIdx = 0

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].tokens
    const userBalancesOfRes = userBalancesOfsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!underlyings || !userBalancesOfRes.success || !totalSupplyRes.success || totalSupplyRes.output == 0n) {
      balanceOfIdx += underlyings.length
      continue
    }

    const poolBalance: Balance = {
      ...pools[poolIdx],
      amount: userBalancesOfRes.output,
      category: 'lp',
      underlyings: [],
      rewards: undefined,
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceRes = tokenBalancesOfRes[balanceOfIdx]

      const underlyingBalance: bigint = underlyingBalanceRes.success ? underlyingBalanceRes.output : 0n

      const underlyingAmount = (underlyingBalance * poolBalance.amount) / totalSupplyRes.output

      poolBalance.underlyings!.push({
        ...underlyings[underlyingIdx],
        address: underlyings[underlyingIdx].erc20address,
        amount: underlyingAmount,
        chain: ctx.chain,
      })

      balanceOfIdx++
    }

    balances.push(poolBalance)
  }

  return balances
}
