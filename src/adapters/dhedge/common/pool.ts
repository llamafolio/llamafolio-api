import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getDeployedFunds: {
    inputs: [],
    name: 'getDeployedFunds',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getdHedgePools(ctx: BaseContext, factory: Contract, token: Contract): Promise<Contract[]> {
  const poolAddresses = await call({ ctx, target: factory.address, abi: abi.getDeployedFunds })
  return poolAddresses.map((address) => ({ chain: ctx.chain, address, underlyings: [token] }))
}
