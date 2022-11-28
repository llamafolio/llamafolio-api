import { Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { ethers } from 'ethers'

import { getRegistries } from './registries'

export async function getLpPoolsContracts(chain: Chain, provider: Contract) {
  const pools: Contract[] = []

  const registry = await getRegistries(chain, provider)
  const basePool = await getBasePoolContracts(chain, provider)

  const getPoolCount = await call({
    chain,
    target: registry.factory,
    params: [],
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'pool_count',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
    },
  })

  const poolAddressesRes = await multicall({
    chain,
    calls: range(0, getPoolCount.output).map((i) => ({
      target: registry.factory,
      params: [i],
    })),
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'pool_list',
      inputs: [{ name: '_index', type: 'uint256' }],
      outputs: [{ name: '', type: 'address' }],
    },
  })

  const poolAddresses = poolAddressesRes.filter((res) => res.success).map((res) => res.output)

  const getUnderlyingsfromPools = await multicall({
    chain,
    calls: poolAddresses.map((pool) => ({
      target: registry.factory,
      params: [pool],
    })),
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'get_coins',
      inputs: [{ name: '_pool', type: 'address' }],
      outputs: [{ name: '', type: 'address[4]' }],
      gas: 9164,
    },
  })

  const underlyingsfromPools = getUnderlyingsfromPools.filter((res) => res.success).map((res) => res.output)

  for (let i = 0; i < poolAddresses.length; i++) {
    const poolAddress = poolAddresses[i]

    const underlyings = underlyingsfromPools[i].filter(
      (underlying: string) => underlying.toLowerCase() !== ethers.constants.AddressZero,
    )

    const underlying = await getERC20Details(chain, underlyings)

    pools.push({
      chain,
      address: poolAddress,
      decimals: 18,
      underlyings: underlying,
    })
  }

  return [...pools, ...basePool]
}

const getBasePoolContracts = async (chain: Chain, provider: Contract) => {
  const pools: Contract[] = []

  const registry = await getRegistries(chain, provider)

  const getPoolCount = await call({
    chain,
    target: registry.factory,
    params: [],
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'base_pool_count',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
      gas: 3618,
    },
  })

  const getBasePoolAddresses = await multicall({
    chain,
    calls: range(0, getPoolCount.output).map((i) => ({
      target: registry.factory,
      params: [i],
    })),
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'base_pool_list',
      inputs: [{ name: 'arg0', type: 'uint256' }],
      outputs: [{ name: '', type: 'address' }],
      gas: 3633,
    },
  })

  const basePoolAddresses = getBasePoolAddresses.filter((res) => res.success).map((res) => res.output)

  const underlyingsFromBasePools: any[] = []

  for (let i = 0; i < basePoolAddresses.length; i++) {
    const basePoolAddress = basePoolAddresses[i]

    const calls = range(0, 3).map((x) => ({
      target: basePoolAddresses[i],
      params: [x],
    }))

    const getUnderlyingsfromBasePools = await multicall({
      chain,
      calls,
      abi: {
        name: 'coins',
        outputs: [{ type: 'address', name: '' }],
        inputs: [{ type: 'uint256', name: 'arg0' }],
        stateMutability: 'view',
        type: 'function',
        gas: 2250,
      },
    })

    underlyingsFromBasePools.push(getUnderlyingsfromBasePools.filter((res) => res.success).map((res) => res.output))
    const underlyings = underlyingsFromBasePools[i].filter(
      (underlying: string) => underlying.toLowerCase() !== ethers.constants.AddressZero,
    )
    const underlying = await getERC20Details(chain, underlyings)

    pools.push({
      chain,
      decimals: 18,
      address: basePoolAddress,
      underlyings: underlying,
    })
  }
  return pools
}
