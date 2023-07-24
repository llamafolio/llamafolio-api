import type { Balance, BalancesContext } from '@lib/adapter'
import { mapSuccess } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

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
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[2]' }],
    gas: 4677,
  },
} as const

export type ProviderBalancesParams = Balance & {
  amount: bigint
  totalSupply: bigint
  lpToken: `0x${string}`
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
  const calls: Call<typeof erc20Abi.balanceOf>[] = []

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
        underlyingBalanceOfRes.success && underlyingBalanceOfRes.output != undefined
          ? underlyingBalanceOfRes.output
          : 0n

      ;(underlying as Balance).amount = (underlyingsBalance * amount) / totalSupply

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

  const underlyingsBalancesRes = await multicall({
    ctx,
    calls: mapSuccess(poolIdsRes, (pool) => ({ target: AURA_VAULT_ADDRESS, params: [pool.output] }) as const),
    abi: abi.getPoolTokens,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount, totalSupply } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (!underlyings || !underlyingsBalanceRes.success) {
      continue
    }

    const [_tokens, balances] = underlyingsBalanceRes.output

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = balances[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * amount) / totalSupply
    })
  }

  return pools
}

export const convexProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const balances: ProviderBalancesParams[] = []
  const CURVE_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'

  if (ctx.chain === 'ethereum') {
    const poolAddressesRes = await multicall({
      ctx,
      calls: pools.map((pool) => ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.lpToken] }) as const),
      abi: abi.get_pool_from_lp_token,
    })

    const underlyingsBalancesRes = await multicall({
      ctx,
      calls: mapSuccess(
        poolAddressesRes,
        (pool) => ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.output] }) as const,
      ),
      abi: abi.get_underlying_balances,
    })

    for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
      const pool = pools[poolIdx]
      const { underlyings, amount, totalSupply } = pool
      const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

      if (!underlyings || !underlyingsBalanceRes.success) {
        continue
      }

      underlyings.forEach((underlying, underlyingIdx) => {
        const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
        ;(underlying as Balance).amount = (underlyingBalance * amount) / totalSupply
      })

      balances.push(pool)
    }
  } else {
    balances.push(...(await curveAltChains(ctx, pools)))
  }

  return balances
}

export const curveAltChains = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const balances: ProviderBalancesParams[] = []

  const underlyingsBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.lpToken })),
    abi: abi.get_balances,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount, totalSupply } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (!underlyings || !underlyingsBalanceRes.success) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * amount) / totalSupply
    })

    balances.push(pool)
  }

  return balances
}
