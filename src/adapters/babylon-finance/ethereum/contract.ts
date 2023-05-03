import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  reserveAsset: {
    inputs: [],
    name: 'reserveAsset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getBabylonContracts(ctx: BaseContext, pools: string[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const reserveAssetsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool })),
    abi: abi.reserveAsset,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const reserveAssetRes = reserveAssetsRes[poolIdx]

    if (!isSuccess(reserveAssetRes)) {
      continue
    }

    contracts.push({ chain: ctx.chain, address: pool, underlyings: [reserveAssetRes.output] })
  }

  return contracts
}
