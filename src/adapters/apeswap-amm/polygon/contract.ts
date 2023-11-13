import type { BaseContext } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import type { GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

const abi = {
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMiniChefPoolInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  const lpTokens = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((i) => ({ target: masterChefAddress, params: [i] }) as const),
    abi: abi.lpToken,
  })

  return mapSuccessFilter(lpTokens, (res) => ({ chain: ctx.chain, address: res.output, pid: res.input.params![0] }))
}
