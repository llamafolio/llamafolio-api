import type { Balance, BalancesContext } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

import type { ProviderBalancesParams } from './interface'

const abi = {
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      { internalType: 'uint256', name: 'amount0Current', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1Current', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const arrakisBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: abi.getUnderlyingBalances }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: erc20Abi.totalSupply }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (
      !underlyings ||
      !amount ||
      !underlyingsBalanceRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const [amount0Current, amount1Current] = underlyingsBalanceRes.output

    ;(underlyings[0] as Balance).amount = BigNumber.from(amount0Current).mul(amount).div(totalSupplyRes.output)
    ;(underlyings[1] as Balance).amount = BigNumber.from(amount1Current).mul(amount).div(totalSupplyRes.output)
  }

  return pools
}
