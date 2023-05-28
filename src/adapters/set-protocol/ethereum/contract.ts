import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getSets: {
    inputs: [],
    name: 'getSets',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getComponents: {
    inputs: [],
    name: 'getComponents',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSetProtocolPools(ctx: BaseContext, controller: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const setsContractsRes = await call({ ctx, target: controller.address, abi: abi.getSets })

  const setsUnderlyingsRes = await multicall({
    ctx,
    calls: setsContractsRes.map((target) => ({ target })),
    abi: abi.getComponents,
  })

  for (let idx = 0; idx < setsContractsRes.length; idx++) {
    const underlyingsRes = setsUnderlyingsRes[idx]
    if (!underlyingsRes.success) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: setsContractsRes[idx],
      underlyings: underlyingsRes.output,
    })
  }

  return pools
}
