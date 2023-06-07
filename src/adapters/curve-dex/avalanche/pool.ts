import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { getERC20Details } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'

import type { Registry } from '../common/registries'

const abi = {
  pool_count: {
    stateMutability: 'view',
    type: 'function',
    name: 'pool_count',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    gas: 2138,
  },
  pool_list: {
    stateMutability: 'view',
    type: 'function',
    name: 'pool_list',
    inputs: [
      {
        name: 'arg0',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    gas: 2217,
  },
  get_pool_name: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_name',
    inputs: [
      {
        name: '_pool',
        type: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    gas: 8323,
  },
  get_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_lp_token',
    inputs: [
      {
        name: 'arg0',
        type: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    gas: 2473,
  },
  get_coins: {
    stableSwap: {
      stateMutability: 'view',
      type: 'function',
      name: 'get_underlying_coins',
      inputs: [{ name: '_pool', type: 'address' }],
      outputs: [{ name: '', type: 'address[8]' }],
      gas: 21345,
    },
    stableFactory: {
      stateMutability: 'view',
      type: 'function',
      name: 'get_underlying_coins',
      inputs: [{ name: '_pool', type: 'address' }],
      outputs: [{ name: '', type: 'address[8]' }],
      gas: 21345,
    },
    cryptoSwap: {
      stateMutability: 'view',
      type: 'function',
      name: 'get_coins',
      inputs: [
        {
          name: '_pool',
          type: 'address',
        },
      ],
      outputs: [
        {
          name: '',
          type: 'address[8]',
        },
      ],
      gas: 22975,
    },
    cryptoFactory: {
      stateMutability: 'view',
      type: 'function',
      name: 'get_coins',
      inputs: [
        {
          name: '_pool',
          type: 'address',
        },
      ],
      outputs: [
        {
          name: '',
          type: 'address[2]',
        },
      ],
    },
  },
  base_pool_list: {
    stateMutability: 'view',
    type: 'function',
    name: 'base_pool_list',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3633,
  },
  base_pool_count: {
    stateMutability: 'view',
    type: 'function',
    name: 'base_pool_count',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3618,
  },
  coins: {
    name: 'coins',
    outputs: [{ type: 'address', name: '' }],
    inputs: [{ type: 'uint256', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
    gas: 2220,
  },
  get_underlying_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
    gas: 21345,
  },
  stableSwap: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
    gas: 21345,
  },
  cryptoSwap: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_coins',
    inputs: [
      {
        name: '_pool',
        type: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address[8]',
      },
    ],
    gas: 22975,
  },
  get_pool_from_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3713,
  },
  UNDERLYING_ASSET_ADDRESS: {
    inputs: [],
    name: 'UNDERLYING_ASSET_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface PoolContract extends Contract {
  lpToken?: `0x${string}`
  pool: `0x${string}`
  registry: string
  registryId?: Registry
}

export async function getAvaxPoolsContracts(ctx: BaseContext, registries: `0x${string}`[]) {
  const [stablePools, stableFactoryPools, cryptoSwapPools] = await Promise.all([
    getFmtPoolsContracts(ctx, registries[0], 'stableSwap'),
    getFmtPoolsContracts(ctx, registries[1], 'stableFactory'),
    getFmtPoolsContracts(ctx, registries[2], 'cryptoSwap'),
  ])

  const allPools = [...stablePools, ...stableFactoryPools, ...cryptoSwapPools]

  // Check if pools use MetaStablePool and merge underlyings if a match is found
  return Promise.all(
    allPools.map(async (pool) => {
      const underlyings = pool.underlyings

      if (
        underlyings &&
        underlyings.some((underlying) =>
          stablePools.some((stablePool) => stablePool.address.toLowerCase() === (underlying as string).toLowerCase()),
        )
      ) {
        const matchingPoolIndex = stablePools.findIndex(
          (stablePool) => stablePool.address.toLowerCase() === (underlyings[0] as string).toLowerCase(),
        )

        if (matchingPoolIndex !== -1) {
          const matchingPool = stablePools[matchingPoolIndex]

          const fmtMatchingPool = {
            ...matchingPool,
            underlyings: await getERC20Details(ctx, matchingPool.underlyings as `0x${string}`[]),
          }

          pool.stablePool = fmtMatchingPool
          pool.underlyings = [fmtMatchingPool as any, ...underlyings.slice(1)]
          stablePools.splice(matchingPoolIndex, 1)
        }
      }

      return pool
    }),
  )
}

export async function getFmtPoolsContracts(ctx: BaseContext, registry: `0x${string}`, registryId: string) {
  const poolContracts: PoolContract[] = []

  const poolsCountRes = await call({
    ctx,
    target: registry,
    abi: abi.pool_count,
  })

  const poolsListRes = await multicall({
    ctx,
    calls: range(0, Number(poolsCountRes)).map((_, idx) => ({ target: registry, params: [BigInt(idx)] } as const)),
    abi: abi.pool_list,
  })

  const calls: Call<typeof abi.get_coins.stableSwap>[] = mapSuccessFilter(poolsListRes, (res) => ({
    target: registry,
    params: [res.output],
  }))

  const [underlyingsTokensRes, lpTokensRes] = await Promise.all([
    // @ts-ignore
    // Registries get_coins implementations are different
    multicall({ ctx, calls, abi: abi.get_coins[registryId] }),
    multicall({ ctx, calls, abi: abi.get_lp_token }),
  ])

  for (let poolIdx = 0; poolIdx < poolsCountRes; poolIdx++) {
    const underlyingTokensRes = underlyingsTokensRes[poolIdx]
    const lpTokenRes = lpTokensRes[poolIdx]
    const pool = lpTokenRes.input.params![0]
    let lpToken: `0x${string}` | undefined = undefined

    // Factory LP tokens are the same as the pool
    if (registryId === 'stableFactory' || registryId === 'cryptoFactory') {
      lpToken = pool
    } else if (lpTokenRes.success) {
      lpToken = lpTokenRes.output
    }

    if (!underlyingTokensRes.success) {
      continue
    }

    const underlyings: any[] = underlyingTokensRes.output
      .map((address) => (address as `0x${string}`).toLowerCase())
      // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
      .filter((address) => (address as `0x${string}`) !== ADDRESS_ZERO)
      // replace ETH alias
      .map((address) => ((address as `0x${string}`) === ETH_ADDR ? ADDRESS_ZERO : address))

    // Replace avToken -> Token since we need to use common known token to get price
    const fmtUnderlyings: any[] = await getUnderlyings(ctx, underlyings)

    if (lpToken)
      poolContracts.push({
        chain: ctx.chain,
        // We must define address as lpToken address since user interact only with lpToken, or we cant catch interaction in index.
        address: lpToken,
        lpToken,
        pool,
        registry,
        underlyings: fmtUnderlyings,
        category: 'lp',
      })
  }

  return poolContracts
}

const getUnderlyings = async (ctx: BaseContext, tokens: `0x${string}`[]) => {
  const underlyingsTokensRes = await multicall({
    ctx,
    calls: tokens.map((token) => ({ target: token })),
    abi: abi.UNDERLYING_ASSET_ADDRESS,
  })

  return tokens.map((token, idx) => {
    return underlyingsTokensRes[idx].success ? underlyingsTokensRes[idx].output : token
  })
}