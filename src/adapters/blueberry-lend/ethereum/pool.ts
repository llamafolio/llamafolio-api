import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getUnderlyingToken: {
    inputs: [],
    name: 'getUnderlyingToken',
    outputs: [{ internalType: 'contract IERC20Upgradeable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBlueBerryPools(ctx: BaseContext, poolAddresses: `0x${string}`[]): Promise<Contract[]> {
  const underlyings = await multicall({
    ctx,
    calls: poolAddresses.map((address) => ({ target: address }) as const),
    abi: abi.getUnderlyingToken,
  })

  return mapSuccessFilter(underlyings, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    underlyings: [res.output],
  }))
}
