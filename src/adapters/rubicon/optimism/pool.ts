import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: 'assetTokenAddress', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getRubiconPools(ctx: BaseContext, poolsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const underlyings = await multicall({
    ctx,
    calls: poolsAddresses.map((poolAddress) => ({ target: poolAddress }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(underlyings, (res, index) => ({
    chain: ctx.chain,
    address: poolsAddresses[index],
    underlyings: [res.output],
  }))
}
