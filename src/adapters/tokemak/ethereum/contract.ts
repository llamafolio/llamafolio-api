import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  getPools: {
    inputs: [],
    name: 'getPools',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlyer: {
    inputs: [],
    name: 'underlyer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTokemakContracts(ctx: BaseContext, manager: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const getPoolsAddresses = await call({ ctx, target: manager.address, abi: abi.getPools })

  const underlyingsAddresses = await multicall({
    ctx,
    calls: getPoolsAddresses.map((pool) => ({ target: pool })),
    abi: abi.underlyer,
  })

  for (let poolIdx = 0; poolIdx < getPoolsAddresses.length; poolIdx++) {
    const getPoolsAddress = getPoolsAddresses[poolIdx]
    const underlyingsAddress = underlyingsAddresses[poolIdx]

    if (!isSuccess(underlyingsAddress)) {
      continue
    }

    pools.push({ chain: ctx.chain, address: getPoolsAddress, underlyings: [underlyingsAddress.output] })
  }

  return pools
}
