import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLocusPools(ctx: BaseContext, pools: `0x${string}`[]): Promise<Contract[]> {
  const tokens = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool }) as const), abi: abi.token })
  return mapSuccessFilter(tokens, (res, index) => ({ chain: ctx.chain, address: pools[index], token: res.output }))
}
