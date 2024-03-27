import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getDefinitiveContracts(ctx: BaseContext, poolAddresses: `0x${string}`[]): Promise<Contract[]> {
  const assets = await multicall({
    ctx,
    calls: poolAddresses.map((address) => ({ target: address }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(assets, (res) => ({ chain: ctx.chain, address: res.input.target, underlyings: [res.output] }))
}
