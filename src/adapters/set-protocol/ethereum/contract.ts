import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

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
}

export async function getSetProtocolPools(ctx: BaseContext, controller: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const setsContractsRes = await call({ ctx, target: controller.address, params: [], abi: abi.getSets })

  const setsUnderlyingsRes = await multicall({
    ctx,
    calls: setsContractsRes.output.map((target: string) => ({ target })),
    abi: abi.getComponents,
  })

  for (let idx = 0; idx < setsContractsRes.output.length; idx++) {
    const underlyingsRes = setsUnderlyingsRes[idx]
    if (!isSuccess(underlyingsRes)) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: setsContractsRes.output[idx],
      underlyings: underlyingsRes.output,
    })
  }

  return pools
}
