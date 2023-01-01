import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Call, multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { isSuccess } from '@lib/type'
import { ethers } from 'ethers'

import { Registry } from './registries'

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
      gas: 12102,
    },
    stableFactory: {
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
          type: 'address[4]',
        },
      ],
      gas: 9164,
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
}

async function getStableFactoryBasePools(ctx: BaseContext, stableFactory: string) {
  const basePoolCountRes = await call({
    chain: ctx.chain,
    target: stableFactory,
    abi: abi.base_pool_count,
  })

  const basePoolCount = parseInt(basePoolCountRes.output)

  const basePoolsRes = await multicall({
    chain: ctx.chain,
    calls: range(0, basePoolCount).map((poolIdx) => ({ target: stableFactory, params: [poolIdx] })),
    abi: abi.base_pool_list,
  })

  const basePoolsCoinsRes = await multicall({
    chain: ctx.chain,
    calls: basePoolsRes
      .filter(isSuccess)
      .map((res) => res.output)
      .flatMap((pool) => range(0, 4).map((coinIdx) => ({ target: pool, params: [coinIdx] }))),
    abi: abi.coins,
  })

  // TODO:
  // - make getPoolsContracts more generic ? all pools have the "coins" function to get underlyings
  // - dissociate multicall errors and no coin error
}

export interface PoolContract extends Contract {
  lpToken: string
  pool: string
  registry: string
  registryId: Registry
}

// TODO:
// - stable factory base pools
// - resolve meta pools LP tokens -> underlyings
// - unwrap custom LP tokens (Yearn etc)

export async function getPoolsContracts(ctx: BaseContext, registries: Partial<Record<Registry, string>>) {
  const poolContracts: PoolContract[] = []
  let calls: Call[] = []

  const registriesIds = Object.keys(registries) as Registry[]
  const registriesAddresses = Object.values(registries)

  const poolsCountRes = await multicall({
    chain: ctx.chain,
    calls: registriesAddresses.map((registry) => ({ target: registry })),
    abi: abi.pool_count,
  })

  const poolsCounts = poolsCountRes.map((res) => (res.success ? parseInt(res.output) : 0))

  for (let registryIdx = 0; registryIdx < registriesAddresses.length; registryIdx++) {
    for (let poolIdx = 0; poolIdx < poolsCounts[registryIdx]; poolIdx++) {
      calls.push({ target: registriesAddresses[registryIdx], params: [poolIdx] })
    }
  }

  const poolsListRes = await multicall<string, [number], string>({
    chain: ctx.chain,
    calls,
    abi: abi.pool_list,
  })

  // lists of pools per registry
  const registriesPools: string[][] = registriesAddresses.map(() => [])

  let callIdx = 0
  for (let registryIdx = 0; registryIdx < registriesAddresses.length; registryIdx++) {
    for (let poolIdx = 0; poolIdx < poolsCounts[registryIdx]; poolIdx++) {
      const poolListRes = poolsListRes[callIdx]

      if (isSuccess(poolListRes)) {
        registriesPools[registryIdx].push(poolListRes.output)
      }

      callIdx++
    }
  }

  calls = []

  for (let registryIdx = 0; registryIdx < registriesPools.length; registryIdx++) {
    for (let poolIdx = 0; poolIdx < registriesPools[registryIdx].length; poolIdx++) {
      calls.push({ target: registriesAddresses[registryIdx], params: [registriesPools[registryIdx][poolIdx]] })
    }
  }

  const [lpTokensRes, poolNamesRes, ...registriesCoins] = await Promise.all([
    multicall<string, [string], string>({
      chain: ctx.chain,
      // TODO: no need to fetch LP tokens for Factory regisitries
      calls,
      abi: abi.get_lp_token,
    }),

    multicall<string, [string], string>({
      chain: ctx.chain,
      calls,
      abi: abi.get_pool_name,
    }),

    ...registriesIds.map((registryId, registryIdx) =>
      multicall<string, [string], string[]>({
        chain: ctx.chain,
        calls: registriesPools[registryIdx].map((pool) => ({
          target: registriesAddresses[registryIdx],
          params: [pool],
        })),
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
      const pool = lpTokenRes.input.params[0]
      const registryId = registriesIds[registryIdx]
      let lpToken: string | undefined = undefined

      // Factory LP tokens are the same as the pool
      if (registryId === 'stableFactory' || registryId === 'cryptoFactory') {
        lpToken = pool
      } else if (isSuccess(lpTokenRes)) {
        lpToken = lpTokenRes.output
      }

      if (lpToken && isSuccess(coinsRes)) {
        const contract: PoolContract = {
          chain: ctx.chain,
          name: nameRes.success ? nameRes.output : undefined,
          address: pool,
          lpToken,
          pool,
          registry: registriesAddresses[registryIdx],
          registryId: registriesIds[registryIdx],
          underlyings: coinsRes.output
            .map((address) => address.toLowerCase())
            // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
            .filter((address) => address !== ethers.constants.AddressZero)
            // replace ETH alias
            .map((address) => (address === ETH_ADDR ? ethers.constants.AddressZero : address)),
        }

        poolContracts.push(contract)
      }

      callIdx++
    }
  }

  return poolContracts
}
