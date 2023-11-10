import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  l1Token: {
    inputs: [],
    name: 'l1Token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAcrossContracts(ctx: BaseContext, poolAddresses: `0x${string}`[]): Promise<Contract[]> {
  const lpTokensRes = await multicall({
    ctx,
    calls: poolAddresses.map((address) => ({ target: address })),
    abi: abi.l1Token,
  })

  return mapSuccessFilter(lpTokensRes, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    underlyings: [res.output],
    category: 'lp',
  }))
}
