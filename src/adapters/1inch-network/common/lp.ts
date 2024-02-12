import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  getBalanceForAddition: {
    inputs: [
      {
        internalType: 'contract IERC20',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'getBalanceForAddition',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function get1InchLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  console.log(pools)

  const [shareBalances, totalSupplies, underlying0Balances, underlying1Balances] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: pool.address, params: [(pool.underlyings![0] as Contract).address] }) as const,
      ),
      abi: abi.getBalanceForAddition,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: pool.address, params: [(pool.underlyings![1] as Contract).address] }) as const,
      ),
      abi: abi.getBalanceForAddition,
    }),
  ])

  return mapMultiSuccessFilter(
    shareBalances.map((_, i) => [shareBalances[i], totalSupplies[i], underlying0Balances[i], underlying1Balances[i]]),

    (res, index) => {
      const pool = pools[index]
      const rawUderlyings = pool.underlyings as Contract[]

      const [{ output: amount }, { output: supply }, { output: token0 }, { output: token1 }] = res.inputOutputPairs
      if (supply === 0n) return null

      const tokens = [token0, token1]

      const underlyings = rawUderlyings.map((underlying, index) => {
        const balance = (amount * tokens[index]) / supply
        return { ...underlying, amount: balance }
      })

      return {
        ...pool,
        amount,
        underlyings,
        rewards: undefined,
        category: 'lp',
      }
    },
  ).filter(isNotNullish)
}
