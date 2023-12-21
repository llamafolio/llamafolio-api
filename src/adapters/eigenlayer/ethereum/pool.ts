import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  underlyingToken: {
    inputs: [],
    name: 'underlyingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEigenlayerPools(
  ctx: BaseContext,
  manager: Contract,
  poolAddresses: `0x${string}`[],
): Promise<Contract> {
  const underlyingsRes = await multicall({
    ctx,
    calls: poolAddresses.map((pool) => ({ target: pool }) as const),
    abi: abi.underlyingToken,
  })

  const underlyings = mapSuccessFilter(underlyingsRes, (res, index) => ({
    chain: ctx.chain,
    address: poolAddresses[index],
    token: res.output,
  }))

  return { ...manager, underlyings }
}
