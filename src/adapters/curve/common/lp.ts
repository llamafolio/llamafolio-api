import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { ethers } from 'ethers'

interface BalanceWithExtraProps extends Balance {
  tokens?: string[]
}

import { getRegistries } from './registries'

export async function getLpPoolsContracts(chain: Chain, provider: Contract) {
  const pools: Contract[] = []

  const registry = await getRegistries(chain, provider)

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
  const poolsInfos = await getERC20Details(chain, poolAddresses)

  const getUnderlyings = await multicall({
    chain,
    calls: poolsInfos.map((pool) => ({
      target: registry.factory,
      params: [pool.address],
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

  const underlyings = getUnderlyings.filter((res) => res.success).map((res) => res.output)

  for (let i = 0; i < poolsInfos.length; i++) {
    const pool = poolsInfos[i]
    const underlying = underlyings[i].filter(
      (underlying: string) => underlying.toLowerCase() !== ethers.constants.AddressZero,
    )

    pools.push({
      chain,
      address: pool.address,
      decimals: pool.decimals,
      symbol: pool.symbol,
      tokens: underlying,
    })
  }

  return pools
}

export async function getLpPoolsBalances(
  ctx: BaseContext,
  chain: Chain,
  lpPools: Contract[],
  provider: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const registry = await getRegistries(chain, provider)

  const nonZeroPoolsBalances: BalanceWithExtraProps[] = (
    await getERC20BalanceOf(ctx, chain, lpPools as Token[])
  ).filter((res) => res.amount.gt(0))

  for (let i = 0; i < nonZeroPoolsBalances.length; i++) {
    const pool = nonZeroPoolsBalances[i]

    if (pool.tokens) {
      const tokens = await getERC20Details(chain, pool.tokens && pool.tokens)

      const [getTotalSupply, getUnderlyingsBalances] = await Promise.all([
        call({
          chain,
          target: pool.address,
          params: [],
          abi: {
            stateMutability: 'view',
            type: 'function',
            name: 'totalSupply',
            inputs: [],
            outputs: [{ name: '', type: 'uint256' }],
            gas: 3408,
          },
        }),

        call({
          chain,
          target: registry.factory,
          params: [pool.address],
          abi: {
            stateMutability: 'view',
            type: 'function',
            name: 'get_balances',
            inputs: [{ name: '_pool', type: 'address' }],
            outputs: [{ name: '', type: 'uint256[4]' }],
            gas: 20435,
          },
        }),
      ])

      const totalSupply = getTotalSupply.output
      const underlyingsBalances = getUnderlyingsBalances.output

      const formattedUnderlyings: any = tokens.map((underlying, x) => ({
        ...underlying,
        amount: underlying.decimals && pool.amount.mul(underlyingsBalances[x]).div(totalSupply),
        decimals: underlying.decimals,
      }))

      balances.push({
        chain,
        address: pool.address,
        amount: pool.amount,
        symbol: tokens.map((coin) => coin.symbol).join('-'),
        underlyings: formattedUnderlyings,
        decimals: 18,
        category: 'lp',
      })
    }
  }
  return balances
}
