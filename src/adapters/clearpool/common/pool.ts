import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getPools: {
    inputs: [],
    name: 'getPools',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  currency: {
    inputs: [],
    name: 'currency',
    outputs: [{ internalType: 'contract IERC20Upgradeable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getClearPools(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const pools = await call({ ctx, target: factory.address, abi: abi.getPools })

  const currencies = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool }) as const),
    abi: abi.currency,
  })

  return mapSuccessFilter(currencies, (res) => ({ chain: ctx.chain, address: res.input.target, token: res.output }))
}
