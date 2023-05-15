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
}

export async function getAcrossContracts(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const lpTokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.l1Token })

  return mapSuccessFilter(lpTokensRes, (res, idx) => ({
    ...pools[idx],
    underlyings: [res.output],
  }))
}
