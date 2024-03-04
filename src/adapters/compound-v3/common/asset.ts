import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
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

export async function getCollContracts(ctx: BaseContext, compounder: Contract): Promise<Contract> {
  const collNumbers = await call({
    ctx,
    target: compounder.address,
    abi: abi.numAssets,
  })

  const assetsInfoRes = await multicall({
    ctx,
    calls: range(0, collNumbers).map((i) => ({ target: compounder.address, params: [i] }) as const),
    abi: abi.getAssetInfo,
  })

  return {
    ...compounder,
    underlyings: mapSuccessFilter(assetsInfoRes, (res) => {
      return { chain: ctx.chain, address: res.output.asset, collateralFactor: res.output.borrowCollateralFactor }
    }),
  }
}
