import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { ethers } from 'ethers'

import { BalanceWithExtraProps, getCurveBalances } from './helper'

export async function getPoolsContracts(chain: Chain, contract: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const poolsCountRes = await call({
    chain,
    target: contract.address,
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
    calls: range(0, poolsCountRes.output).map((i) => ({
      target: contract.address,
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

  const nonDuplicatePoolAddresses = [...new Set(poolAddresses)]

  const calls = nonDuplicatePoolAddresses.map((address) => ({
    target: contract.address,
    params: [address],
  }))

  const [poolsDetailsNamesRes, poolsLPTokensRes, coinsAddressesResponse, underlyingsAddressesResponse] =
    await Promise.all([
      multicall({
        chain,
        calls,
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'get_pool_name',
          inputs: [{ name: '_pool', type: 'address' }],
          outputs: [{ name: '', type: 'string' }],
        },
      }),

      multicall({
        chain,
        calls,
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'get_lp_token',
          inputs: [{ name: '_pool', type: 'address' }],
          outputs: [{ name: '', type: 'address' }],
        },
      }),

      multicall({
        chain,
        calls,
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'get_coins',
          inputs: [{ name: '_pool', type: 'address' }],
          outputs: [{ name: '', type: 'address[8]' }],
        },
      }),

      multicall({
        chain,
        calls,
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'get_underlying_coins',
          inputs: [{ name: '_pool', type: 'address' }],
          outputs: [{ name: '', type: 'address[8]' }],
        },
      }),
    ])

  const poolsDetailsNames = poolsDetailsNamesRes.filter((res) => res.success).map((res) => res.output)

  const poolsLPTokens = poolsLPTokensRes.filter((res) => res.success).map((res) => res.output)

  const coinsAddressesRes = coinsAddressesResponse.filter((res) => res.success).map((res) => res.output)

  const underlyingsAddressesRes = underlyingsAddressesResponse.filter((res) => res.success).map((res) => res.output)

  for (let i = 0; i < coinsAddressesRes.length; i++) {
    const poolDetailName = poolsDetailsNames[i]
    const poolLPToken = poolsLPTokens[i]
    const nonDuplicatePoolAddress = nonDuplicatePoolAddresses[i]

    const coinsAddresses = coinsAddressesRes[i]
      .filter((coin: string) => coin.toLowerCase() !== ethers.constants.AddressZero)
      .map((coin: string) => (coin.toLowerCase() === ETH_ADDR ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' : coin))

    const underlyingsAddresses = underlyingsAddressesRes[i]
      .filter((coin: string) => coin.toLowerCase() !== ethers.constants.AddressZero)
      .map((coin: string) => (coin.toLowerCase() === ETH_ADDR ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' : coin))

    pools.push({
      chain,
      name: poolDetailName,
      address: poolLPToken,
      lpToken: poolLPToken,
      poolAddress: nonDuplicatePoolAddress,
      tokens: coinsAddresses,
      underlyings: underlyingsAddresses,
    })
  }

  return pools
}

export async function getPoolsBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  registry: Contract,
): Promise<BalanceWithExtraProps[]> {
  const balances: BalanceWithExtraProps[] = []

  const poolsBalances = await getCurveBalances(ctx, chain, contracts, registry)

  for (let i = 0; i < poolsBalances.length; i++) {
    const pool = poolsBalances[i]

    balances.push({
      chain,
      address: pool.address,
      symbol: pool.symbol,
      tokens: pool.tokens,
      decimals: pool.decimals,
      amount: pool.amount,
      underlyings: pool.underlyings,
      category: 'lp',
    })
  }

  return balances
}
