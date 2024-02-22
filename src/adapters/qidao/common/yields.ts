import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  Token: {
    constant: true,
    inputs: [],
    name: 'Token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  UNDERLYING_ASSET_ADDRESS: {
    inputs: [],
    name: 'UNDERLYING_ASSET_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getQidaoYieldsContracts(ctx: BaseContext, yieldsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const tokens = await multicall({
    ctx,
    calls: yieldsAddresses.map((address) => ({ target: address }) as const),
    abi: abi.Token,
  })

  const underlyings = await multicall({
    ctx,
    calls: mapSuccessFilter(tokens, (res) => ({ target: res.output }) as const),
    abi: abi.UNDERLYING_ASSET_ADDRESS,
  })

  return mapSuccessFilter(underlyings, (res, index) => {
    const address = tokens[index].input.target
    const token = res.input.target
    const underlyings = [res.output]

    return { chain: ctx.chain, address, token, underlyings }
  })
}
