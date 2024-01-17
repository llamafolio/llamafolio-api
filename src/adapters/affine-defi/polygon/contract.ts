import type { BaseContext } from '@lib/adapter'
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

const URL: string = 'https://api.affinedefi.com/v2/getBasketMetadata'

const chaindId: { [key: string]: number } = {
  polygon: 137,
}

export async function getAffineContracts(ctx: BaseContext) {
  const rawDatas = await fetch(URL).then((res) => res.json())

  const datas = Object.values(rawDatas)
    .filter((data: any) => data.chainId === chaindId[ctx.chain])
    .map((data: any) => ({ chain: ctx.chain, address: data.basketAddress }))

  const assets = await multicall({
    ctx,
    calls: datas.map((data) => ({ target: data.address }) as const),
    abi: abi.asset,
  })

  return mapSuccessFilter(assets, (res, index) => ({ ...datas[index], underlyings: [res.output] }))
}
