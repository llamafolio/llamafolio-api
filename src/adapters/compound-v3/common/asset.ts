import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getAssetInfo: {
    inputs: [{ internalType: 'uint8', name: 'i', type: 'uint8' }],
    name: 'getAssetInfo',
    outputs: [
      {
        components: [
          { internalType: 'uint8', name: 'offset', type: 'uint8' },
          { internalType: 'address', name: 'asset', type: 'address' },
          { internalType: 'address', name: 'priceFeed', type: 'address' },
          { internalType: 'uint64', name: 'scale', type: 'uint64' },
          {
            internalType: 'uint64',
            name: 'borrowCollateralFactor',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'liquidateCollateralFactor',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'liquidationFactor',
            type: 'uint64',
          },
          { internalType: 'uint128', name: 'supplyCap', type: 'uint128' },
        ],
        internalType: 'struct CometCore.AssetInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  numAssets: {
    inputs: [],
    name: 'numAssets',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAssetsContracts(ctx: BaseContext, compounders: Contract[]): Promise<Contract[]> {
  const numberOfAssets = await multicall({
    ctx,
    calls: compounders.map((contract) => ({ target: contract.address })),
    abi: abi.numAssets,
  })

  const assetsInfoRes = await multicall({
    ctx,
    //@ts-expect-error
    calls: mapSuccessFilter(numberOfAssets, (responses) =>
      range(0, responses.output).map((res) => ({ target: responses.input.target, params: [res] })),
    ).flat(),
    abi: abi.getAssetInfo,
  })

  return mapSuccessFilter(assetsInfoRes, (res) => ({
    chain: ctx.chain,
    address: res.output.asset,
    compounder: res.input.target,
    collateralFactor: res.output.borrowCollateralFactor,
  }))
}
