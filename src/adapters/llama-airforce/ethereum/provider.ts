import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

import type { LlamaBalancesParams } from './balance'

const abi = {
  balanceOfUnderlying: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'balanceOfUnderlying',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalUnderlying: {
    inputs: [],
    name: 'totalUnderlying',
    outputs: [{ internalType: 'uint256', name: 'total', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const convexProvider = async (ctx: BalancesContext, pools: LlamaBalancesParams[]): Promise<Balance[]> => {
  const fmtBalancesOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
    abi: abi.balanceOfUnderlying,
  })

  return pools
    .map((pool, poolIdx) => {
      const fmtBalancesOfRes = fmtBalancesOfsRes[poolIdx]
      if (!fmtBalancesOfRes.success) {
        return null
      }

      return { ...pool, amount: fmtBalancesOfRes.output }
    })
    .filter(isNotNullish)
}

export const llamaProvider = async (ctx: BalancesContext, pools: LlamaBalancesParams[]): Promise<Balance[]> => {
  const fmtBalancesOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [BigInt(pool.amount.toString())] } as const)),
    abi: abi.convertToAssets,
  })

  return pools
    .map((pool, poolIdx) => {
      const fmtBalancesOfRes = fmtBalancesOfsRes[poolIdx]
      if (!fmtBalancesOfRes.success) {
        return null
      }

      return { ...pool, amount: fmtBalancesOfRes.output }
    })
    .filter(isNotNullish)
}

export const curveProvider = async (ctx: BalancesContext, pools: LlamaBalancesParams[]): Promise<Balance[]> => {
  const CURVE_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'

  const [fmtBalancesOfsRes, totalUnderlyingsSupplies, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: abi.balanceOfUnderlying,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => (pool.lpToken ? { target: pool.lpToken } : null)),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) =>
        pool.pool ? ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.pool] } as const) : null,
      ),
      abi: abi.get_underlying_balances,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const fmtBalancesOfRes = fmtBalancesOfsRes[poolIdx]
    const totalUnderlyingsSupply = totalUnderlyingsSupplies[poolIdx]
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (
      !underlyings ||
      !fmtBalancesOfRes.success ||
      !underlyingsBalanceRes.success ||
      !totalUnderlyingsSupply.success ||
      totalUnderlyingsSupply.output === 0n
    ) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * fmtBalancesOfRes.output) / totalUnderlyingsSupply.output
    })
  }

  return pools
}
