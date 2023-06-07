import type { BaseContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'

import type { Registry } from './registries'

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
} as const

export interface PoolContract extends Contract {
  lpToken: `0x${string}`
  pool: `0x${string}`
  registry: string
  registryId: Registry
}

export async function getPoolsContracts(ctx: BaseContext, registries: Partial<Record<Registry, `0x${string}`>>) {
  const poolContracts: PoolContract[] = []
  const poolListCalls: Call<typeof abi.pool_list>[] = []

  const registriesIds = Object.keys(registries) as Registry[]
  const registriesAddresses = Object.values(registries)

  const poolsCountRes = await multicall({
    ctx,
    calls: registriesAddresses.map((registry) => ({ target: registry })),
    abi: abi.pool_count,
  })

  const poolsCounts = poolsCountRes.map((res) => (res.success ? Number(res.output) : 0))

  for (let registryIdx = 0; registryIdx < registriesAddresses.length; registryIdx++) {
    for (let poolIdx = 0; poolIdx < poolsCounts[registryIdx]; poolIdx++) {
      poolListCalls.push({ target: registriesAddresses[registryIdx], params: [BigInt(poolIdx)] })
    }
  }

  const poolsListRes = await multicall({ ctx, calls: poolListCalls, abi: abi.pool_list })

  // lists of pools per registry
  const registriesPools: `0x${string}`[][] = registriesAddresses.map(() => [])

  let callIdx = 0
  for (let registryIdx = 0; registryIdx < registriesAddresses.length; registryIdx++) {
    for (let poolIdx = 0; poolIdx < poolsCounts[registryIdx]; poolIdx++) {
      const poolListRes = poolsListRes[callIdx]

      if (poolListRes.success) {
        registriesPools[registryIdx].push(poolListRes.output)
      }

      callIdx++
    }
  }

  const calls: Call<typeof abi.get_lp_token>[] = []

  for (let registryIdx = 0; registryIdx < registriesPools.length; registryIdx++) {
    for (let poolIdx = 0; poolIdx < registriesPools[registryIdx].length; poolIdx++) {
      calls.push({ target: registriesAddresses[registryIdx], params: [registriesPools[registryIdx][poolIdx]] })
    }
  }

  const [lpTokensRes, poolNamesRes, ...registriesCoins] = await Promise.all([
    multicall({ ctx, calls, abi: abi.get_lp_token }),
    multicall({ ctx, calls, abi: abi.get_pool_name }),

    ...registriesIds.map((registryId, registryIdx) =>
      multicall({
        ctx,
        calls: registriesPools[registryIdx].map(
          (pool) => ({ target: registriesAddresses[registryIdx], params: [pool] } as const),
        ),
        // Registries get_coins implementations are different
        abi: abi.get_coins[registryId],
      }),
    ),
  ])

  callIdx = 0
  for (let registryIdx = 0; registryIdx < registriesPools.length; registryIdx++) {
    const registryCoins = registriesCoins[registryIdx]

    for (let poolIdx = 0; poolIdx < registriesPools[registryIdx].length; poolIdx++) {
      const lpTokenRes = lpTokensRes[callIdx]
      const nameRes = poolNamesRes[callIdx]
      const coinsRes = registryCoins[poolIdx]
      const pool = lpTokenRes.input.params![0]
      const registryId = registriesIds[registryIdx]
      let lpToken: `0x${string}` | undefined = undefined

      // Factory LP tokens are the same as the pool
      if (registryId === 'stableFactory' || registryId === 'cryptoFactory') {
        lpToken = pool
      } else if (lpTokenRes.success) {
        lpToken = lpTokenRes.output
      }

      if (lpToken && coinsRes.success) {
        const contract: PoolContract = {
          chain: ctx.chain,
          name: nameRes.success ? nameRes.output : undefined,
          // We must define address as lpToken address since user interact only with lpToken, or we cant catch interaction in index.
          address: lpToken,
          lpToken,
          pool,
          registry: registriesAddresses[registryIdx],
          registryId: registriesIds[registryIdx],
          underlyings: coinsRes.output
            .map((address) => address.toLowerCase())
            // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
            .filter((address) => address !== ADDRESS_ZERO)
            // replace ETH alias
            .map((address) => (address === ETH_ADDR ? ADDRESS_ZERO : address)),
        }

        poolContracts.push(contract)
      }

      callIdx++
    }
  }

  return poolContracts
}
