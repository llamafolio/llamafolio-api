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

export async function getMorphoContracts(ctx: BaseContext, morphos: Contract[]): Promise<Contract[]> {
  const assets = await multicall({
    ctx,
    calls: morphos.map((morpho) => ({ target: morpho.address }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(assets, (res, index) => ({ ...morphos[index], underlyings: [res.output] }))
}
