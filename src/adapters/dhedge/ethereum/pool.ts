import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  deployedFunds: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'deployedFunds',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  deployedFundsLength: {
    inputs: [],
    name: 'deployedFundsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getdHedgePools(ctx: BaseContext, factory: Contract, token: Contract): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: factory.address, abi: abi.deployedFundsLength })

  const poolsAddresses = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((i) => ({ target: factory.address, params: [i] }) as const),
    abi: abi.deployedFunds,
  })

  return mapSuccessFilter(poolsAddresses, (res) => ({ chain: ctx.chain, address: res.output, underlyings: [token] }))
}
