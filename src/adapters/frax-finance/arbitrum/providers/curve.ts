import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[2]' }],
    gas: 4707,
  },
} as const

import type { ProviderBalancesParams } from '../../providers/interface'

export const curveBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const [underlyingsBalancesRes, poolSuppliesRes] = await Promise.all([
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: abi.get_balances }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: erc20Abi.totalSupply }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]
    const poolSupplyRes = poolSuppliesRes[poolIdx]

    if (!underlyings || !underlyingsBalanceRes.success || !poolSupplyRes.success || poolSupplyRes.output === 0n) {
      continue
    }

    underlyings.forEach((underlying: Contract, underlyingIdx: number) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * amount) / poolSupplyRes.output
    })
  }

  return pools
}
