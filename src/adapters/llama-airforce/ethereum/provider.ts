import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isNotNullish, isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

export const convexProvider = async (ctx: BalancesContext, pools: LlamaBalancesParams[]): Promise<Balance[]> => {
  const fmtBalancesOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
    abi: abi.balanceOfUnderlying,
  })

  return pools
    .map((pool, poolIdx) => {
      const fmtBalancesOfRes = fmtBalancesOfsRes[poolIdx]
      if (!isSuccess(fmtBalancesOfRes)) {
        return null
      }

      return { ...pool, amount: BigNumber.from(fmtBalancesOfRes.output) }
    })
    .filter(isNotNullish)
}

export const llamaProvider = async (ctx: BalancesContext, pools: LlamaBalancesParams[]): Promise<Balance[]> => {
  const fmtBalancesOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [pool.amount.toString()] })),
    abi: abi.convertToAssets,
  })

  return pools
    .map((pool, poolIdx) => {
      const fmtBalancesOfRes = fmtBalancesOfsRes[poolIdx]
      if (!isSuccess(fmtBalancesOfRes)) {
        return null
      }

      return { ...pool, amount: BigNumber.from(fmtBalancesOfRes.output) }
    })
    .filter(isNotNullish)
}

export const curveProvider = async (ctx: BalancesContext, pools: LlamaBalancesParams[]): Promise<Balance[]> => {
  const CURVE_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'

  const [fmtBalancesOfsRes, totalUnderlyingsSupplies, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
      abi: abi.balanceOfUnderlying,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.lpToken })),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.pool!] })),
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
      !isSuccess(fmtBalancesOfRes) ||
      !isSuccess(underlyingsBalanceRes) ||
      !isSuccess(totalUnderlyingsSupply) ||
      isZero(totalUnderlyingsSupply.output)
    ) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount =
        BigNumber.from(underlyingBalance).mul(fmtBalancesOfRes.output).div(totalUnderlyingsSupply.output) || BN_ZERO
    })
  }

  return pools
}
