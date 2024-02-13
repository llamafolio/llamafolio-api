import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  allPools: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPools',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  allPoolsLength: {
    inputs: [],
    name: 'allPoolsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGammaSwapPools(ctx: BaseContext, factories: `0x${string}`[]): Promise<Contract[]> {
  const poolLength = await multicall({
    ctx,
    calls: factories.map((factory) => ({ target: factory }) as const),
    abi: abi.allPoolsLength,
  })

  const poolAddresses = await Promise.all(
    mapSuccessFilter(poolLength, async (res) => {
      return await multicall({
        ctx,
        calls: rangeBI(0n, res.output).map((i) => ({ target: res.input.target, params: [i] }) as const),
        abi: abi.allPools,
      })
    }),
  )

  const tokens = await multicall({
    ctx,
    calls: mapSuccessFilter(poolAddresses.flat(), (res) => ({ target: res.output }) as const),
    abi: abi.asset,
  })

  const pools = mapSuccessFilter(tokens, (res) => {
    return { chain: ctx.chain, address: res.input.target, token: res.output }
  })

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}

export async function getGammaSwapPoolBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const poolBalances = mapSuccessFilter(balances, (res, index) => ({
    ...(pools[index] as Balance),
    amount: res.output,
    categoy: 'lp',
  }))

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
