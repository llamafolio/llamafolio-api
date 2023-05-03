import type { Balance, BalancesContext } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  get_pool_from_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
}

export type ProviderBalancesParams = Balance & {
  amount: BigNumber
  totalSupply: BigNumber
  lpToken: string
  strategy: string
}

export const noProvider = async (
  _ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  for (const pool of pools) {
    const { amount, underlyings } = pool
    if (underlyings && underlyings.length < 2) {
      ;(pool.underlyings![0] as Balance).amount = amount
    }
  }

  return pools
}

export const sushiProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const calls: Call[] = []

  for (const pool of pools) {
    const { underlyings, lpToken } = pool
    if (!underlyings) {
      continue
    }

    for (const underlying of underlyings) {
      calls.push({ target: underlying.address, params: [lpToken] })
    }
  }

  const underlyingsBalancesRes = await multicall({ ctx, calls, abi: erc20Abi.balanceOf })

  let balanceOfIdx = 0
  for (const pool of pools) {
    const { underlyings, amount, totalSupply } = pool
    if (!underlyings) {
      continue
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlying = underlyings[underlyingIdx]
      const underlyingBalanceOfRes = underlyingsBalancesRes[balanceOfIdx]

      const underlyingsBalance =
        isSuccess(underlyingBalanceOfRes) && underlyingBalanceOfRes.output != undefined
          ? BigNumber.from(underlyingBalanceOfRes.output)
          : BN_ZERO

      ;(underlying as Balance).amount = underlyingsBalance.mul(amount).div(totalSupply)

      balanceOfIdx++
    }
  }

  return pools
}

export const auraProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const AURA_VAULT_ADDRESS = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'

  const poolIdsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.lpToken })),
    abi: abi.getPoolId,
  })

  const calls: Call[] = poolIdsRes.map((pool) => ({
    target: AURA_VAULT_ADDRESS,
    params: [isSuccess(pool) ? pool.output : null],
  }))

  const underlyingsBalancesRes = await multicall({ ctx, calls, abi: abi.getPoolTokens })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount, totalSupply } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (!underlyings || !isSuccess(underlyingsBalanceRes)) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output.balances[underlyingIdx]
      ;(underlying as Balance).amount = BigNumber.from(underlyingBalance).mul(amount).div(totalSupply) || BN_ZERO
    })
  }

  return pools
}

export const convexProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const CURVE_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'

  const poolAddressesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.lpToken] })),
    abi: abi.get_pool_from_lp_token,
  })

  const calls: Call[] = poolAddressesRes.map((pool) => ({
    target: CURVE_REGISTRY_ADDRESS,
    params: [isSuccess(pool) ? pool.output : null],
  }))

  const underlyingsBalancesRes = await multicall({ ctx, calls, abi: abi.get_underlying_balances })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount, totalSupply } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (!underlyings || !isSuccess(underlyingsBalanceRes)) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount = BigNumber.from(underlyingBalance).mul(amount).div(totalSupply) || BN_ZERO
    })
  }

  return pools
}
