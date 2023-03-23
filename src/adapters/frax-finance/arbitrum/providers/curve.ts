import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[2]' }],
    gas: 4707,
  },
}

import { ProviderBalancesParams } from '../../providers/interface'

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

    if (
      !underlyings ||
      !isSuccess(underlyingsBalanceRes) ||
      !isSuccess(poolSupplyRes) ||
      isZero(poolSupplyRes.output)
    ) {
      continue
    }

    underlyings.forEach((underlying: Contract, underlyingIdx: number) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount =
        BigNumber.from(underlyingBalance).mul(amount).div(poolSupplyRes.output) || BN_ZERO
    })
  }

  return pools
}
