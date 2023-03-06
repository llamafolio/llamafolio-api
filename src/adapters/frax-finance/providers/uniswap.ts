import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
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
}

import { ProviderBalancesParams } from './utils'

export const uniswapProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const calls: Call[] = pools.map((pool) => ({
    target: pool.lpToken,
    params: [],
  }))

  const [token0sRes, token1sRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.token0 }),
    multicall({ ctx, calls, abi: abi.token1 }),
  ])

  pools.forEach((pool, idx) => {
    const token0Res = token0sRes[idx]
    const token1Res = token1sRes[idx]

    if (!isSuccess(token0Res) || !isSuccess(token1Res)) {
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
  const underlyingsCalls: Call[] = []

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
    if (!underlyings || !isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
      continue
    }

    underlyings.forEach((underlying) => {
      const underlyingBalanceOfRes = underlyingsBalancesRes[balanceOfIdx]

      const underlyingsBalance =
        isSuccess(underlyingBalanceOfRes) && underlyingBalanceOfRes.output != undefined
          ? BigNumber.from(underlyingBalanceOfRes.output)
          : BN_ZERO

      ;(underlying as Balance).amount = underlyingsBalance.mul(amount).div(totalSupplyRes.output)

      balanceOfIdx++
    })
  }

  return pools
}
