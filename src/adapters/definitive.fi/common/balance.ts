import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  balanceOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalAssets: {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ internalType: 'uint256', name: 'totalAssetsAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getDefinitiveBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userShares, totalSupplies, totalAssets] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: abi.totalSupply }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: abi.totalAssets }),
  ])

  return mapMultiSuccessFilter(
    userShares.map((_, i) => [userShares[i], totalSupplies[i], totalAssets[i]]),

    (res, index) => {
      const pool = pools[index]
      const rawUnderlying = pool.underlyings![0] as Contract
      if (!rawUnderlying) return null

      const [{ output: share }, { output: totalShare }, { output: totalAsset }] = res.inputOutputPairs
      const underlyings = [{ ...rawUnderlying, amount: (share * totalAsset) / totalShare }]

      return {
        ...pool,
        amount: share,
        underlyings,
        rewards: undefined,
        category: 'farm',
      }
    },
  ).filter(isNotNullish)
}
