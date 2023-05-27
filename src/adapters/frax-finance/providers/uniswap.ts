import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  token0: {
    constant: true,
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    constant: true,
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

import type { ProviderBalancesParams } from './interface'

export const uniswapProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const calls: Call<typeof abi.token0>[] = pools.map((pool) => ({ target: pool.lpToken }))

  const [token0sRes, token1sRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.token0 }),
    multicall({ ctx, calls, abi: abi.token1 }),
  ])

  pools.forEach((pool, idx) => {
    const token0Res = token0sRes[idx]
    const token1Res = token1sRes[idx]

    if (!token0Res.success || !token1Res.success) {
      return
    }

    pool.underlyings = [token0Res.output, token1Res.output]
  })

  return pools
}

export const uniswapBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const underlyingsCalls: Call<typeof erc20Abi.balanceOf>[] = []

  for (const pool of pools) {
    const { underlyings, lpToken } = pool
    if (!underlyings) {
      continue
    }

    for (const underlying of underlyings) {
      underlyingsCalls.push({ target: underlying.address, params: [lpToken] })
    }
  }

  const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({ ctx, calls: underlyingsCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.lpToken })), abi: erc20Abi.totalSupply }),
  ])

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    if (!underlyings || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      continue
    }

    underlyings.forEach((underlying) => {
      const underlyingBalanceOfRes = underlyingsBalancesRes[balanceOfIdx]

      const underlyingsBalance =
        underlyingBalanceOfRes.success && underlyingBalanceOfRes.success
          ? BigNumber.from(underlyingBalanceOfRes.output)
          : BN_ZERO

      ;(underlying as Balance).amount = underlyingsBalance.mul(amount).div(totalSupplyRes.output)

      balanceOfIdx++
    })
  }

  return pools
}
