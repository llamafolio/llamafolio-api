import type { Balance, BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  metadata: {
    inputs: [],
    name: 'metadata',
    outputs: [
      { internalType: 'uint256', name: 'dec0', type: 'uint256' },
      { internalType: 'uint256', name: 'dec1', type: 'uint256' },
      { internalType: 'uint256', name: 'r0', type: 'uint256' },
      { internalType: 'uint256', name: 'r1', type: 'uint256' },
      { internalType: 'bool', name: 'st', type: 'bool' },
      { internalType: 'address', name: 't0', type: 'address' },
      { internalType: 'address', name: 't1', type: 'address' },
      { internalType: 'uint256', name: '_feeRatio', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokenInfo: {
    inputs: [
      { internalType: 'bytes32', name: 'poolId', type: 'bytes32' },
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
    ],
    name: 'getPoolTokenInfo',
    outputs: [
      { internalType: 'uint256', name: 'cash', type: 'uint256' },
      { internalType: 'uint256', name: 'managed', type: 'uint256' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
      { internalType: 'address', name: 'assetManager', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3153,
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 41626,
  },
  get_pool: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  pool: {
    inputs: [],
    name: 'pool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface RegistryParams {
  address: string
  underlyingAbi: boolean
}

export type fmtProviderBalancesParams = Balance & {
  amount: BigNumber
  totalSupply: BigNumber
  lpToken: string
  strategy: string
}

export const fmtNoProvider = async (
  _ctx: BalancesContext,
  pools: fmtProviderBalancesParams[],
): Promise<fmtProviderBalancesParams[]> => {
  for (const pool of pools) {
    const { amount, underlyings } = pool
    if (underlyings && underlyings.length < 2) {
      ;(pool.underlyings![0] as Balance).amount = amount
    }
  }

  return pools
}

export const fmtSolidlyProvider = async (
  ctx: BalancesContext,
  pools: fmtProviderBalancesParams[],
): Promise<fmtProviderBalancesParams[]> => {
  const calls = pools.map((pool) => ({ target: pool.lpToken }))
  const underlyingsBalancesRes = await multicall({ ctx, calls, abi: abi.metadata })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount, totalSupply } = pool
    const underlyingBalanceRes = underlyingsBalancesRes[poolIdx]

    if (!underlyings || !isSuccess(underlyingBalanceRes)) {
      continue
    }

    ;(pool.underlyings![0] as Balance).amount = BigNumber.from(underlyingBalanceRes.output.r0)
      .mul(amount)
      .div(totalSupply)
    ;(pool.underlyings![1] as Balance).amount = BigNumber.from(underlyingBalanceRes.output.r1)
      .mul(pool.amount)
      .div(totalSupply)
  }

  return pools
}

export const fmtBalancerProvider = async (
  ctx: BalancesContext,
  pools: fmtProviderBalancesParams[],
  registry: string,
): Promise<fmtProviderBalancesParams[]> => {
  const poolIdsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.lpToken })),
    abi: abi.getPoolId,
  })

  const calls: Call[] = []
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    const poolIdRes = poolIdsRes[poolIdx]
    if (!underlyings || !isSuccess(poolIdRes)) {
      continue
    }

    for (const underlying of underlyings) {
      calls.push({ target: registry, params: [poolIdRes.output, underlying.address] })
    }
  }

  const underlyingsBalancesRes = await multicall({ ctx, calls, abi: abi.getPoolTokenInfo })

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
          ? BigNumber.from(underlyingBalanceOfRes.output.cash)
          : BN_ZERO

      ;(underlying as Balance).amount = underlyingsBalance.mul(amount).div(totalSupply)

      balanceOfIdx++
    }
  }

  return pools
}

export const fmtSushiProvider = async (
  ctx: BalancesContext,
  pools: fmtProviderBalancesParams[],
): Promise<fmtProviderBalancesParams[]> => {
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

export const fmtCurveProvider = async (
  ctx: BalancesContext,
  pools: fmtProviderBalancesParams[],
  registries: RegistryParams[],
): Promise<fmtProviderBalancesParams[]> => {
  let optionAbiBalances = {}

  for (const pool of pools) {
    const { underlyings, amount, totalSupply, strategy } = pool

    if (!underlyings) {
      continue
    }

    const poolAddress = await call({ ctx, target: strategy, abi: abi.pool })

    const calls: Call[] = []
    for (const registry of registries) {
      calls.push({ target: registry.address, params: [poolAddress] })

      if (registry.underlyingAbi !== true) {
        optionAbiBalances = abi.get_balances
      } else {
        optionAbiBalances = abi.get_underlying_balances
      }
    }

    const underlyingsBalancesRes = await multicall({ ctx, calls, abi: optionAbiBalances })

    for (let registryIdx = 0; registryIdx < registries.length; registryIdx++) {
      const underlyingsBalanceRes = underlyingsBalancesRes[registryIdx]

      if (!isSuccess(underlyingsBalanceRes)) {
        continue
      }

      underlyings.forEach((underlying, underlyingIdx) => {
        const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]

        ;(underlying as Balance).amount = BigNumber.from(underlyingBalance).mul(amount).div(totalSupply) || BN_ZERO
      })
    }
  }

  return pools
}
