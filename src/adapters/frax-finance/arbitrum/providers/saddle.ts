import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getTokenBalance: {
    inputs: [{ internalType: 'uint8', name: 'index', type: 'uint8' }],
    name: 'getTokenBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

import type { ProviderBalancesParams } from '../../providers/interface'

export const saddleBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const [underlyingsBalancesRes, poolSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        pool.underlyings!.map((_, idx) => ({ target: (pool as Contract).swapper, params: [idx] }) as const),
      ),
      abi: abi.getTokenBalance,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.lpToken })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const poolSupplyRes = poolSuppliesRes[poolIdx]

    if (!underlyings || !poolSupplyRes.success || poolSupplyRes.output === 0n) {
      continue
    }
    underlyings.forEach((underlying: Contract, underlyingIdx: number) => {
      const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

      const underlyingBalance = underlyingsBalance.success ? underlyingsBalance.output : 0n
      ;(underlying as Balance).amount = (underlyingBalance * amount) / poolSupplyRes.output
    })
  }

  return pools
}
