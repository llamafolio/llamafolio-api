import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTruefiPoolsContracts(
  ctx: BaseContext,
  stakersAddresses: `0x${string}`[],
): Promise<Contract[]> {
  const underlyings = await multicall({
    ctx,
    calls: stakersAddresses.map((address) => ({ target: address }) as const),
    abi: abi.token,
  })

  return mapSuccessFilter(underlyings, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    underlyings: [res.output],
  }))
}
