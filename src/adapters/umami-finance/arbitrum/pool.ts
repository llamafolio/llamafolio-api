import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUmamiPools(ctx: BaseContext, poolsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const assetsRes = await multicall({
    ctx,
    calls: poolsAddresses.map((address) => ({ target: address }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(assetsRes, (res) => ({ chain: ctx.chain, address: res.input.target, token: res.output }))
}

export async function getUmamiBoostedPools(ctx: BaseContext, poolsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const assetsBoostedRes = await multicall({
    ctx,
    calls: poolsAddresses.map((address) => ({ target: address }) as const),
    abi: abi.asset,
  })

  const pools: Contract[] = mapSuccessFilter(assetsBoostedRes, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    token: res.output,
  }))

  const assetsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.token! }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(assetsRes, (res, i) => ({ ...pools[i], underlyings: [res.output] }))
}
