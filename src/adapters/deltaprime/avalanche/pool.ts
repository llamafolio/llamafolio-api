import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  tokenAddress: {
    inputs: [],
    name: 'tokenAddress',
    outputs: [{ internalType: 'address payable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getDeltaPools(ctx: BaseContext, poolAddresses: `0x${string}`[]): Promise<Contract[]> {
  const tokensRes = await multicall({
    ctx,
    calls: poolAddresses.map((pool) => ({ target: pool })),
    abi: abi.tokenAddress,
  })

  return mapSuccessFilter(tokensRes, (res, index) => ({
    chain: ctx.chain,
    address: poolAddresses[index],
    underlyings: [res.output],
  }))
}
