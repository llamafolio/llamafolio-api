import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  length: {
    inputs: [],
    name: 'length',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pools: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'pools',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  gauges: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'gauges',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getThenaContracts(ctx: BaseContext, voter: Contract): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: voter.address, abi: abi.length })

  const poolsAddressesRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: voter.address, params: [idx] }) as const),
    abi: abi.pools,
  })

  const gaugesAddressesRes = await multicall({
    ctx,
    calls: mapSuccessFilter(poolsAddressesRes, (res) => ({ target: voter.address, params: [res.output] }) as const),
    abi: abi.gauges,
  })

  const pools = mapSuccessFilter(gaugesAddressesRes, (res) => ({
    chain: ctx.chain,
    address: res.input.params[0],
    gauge: res.output,
  }))

  return getPairsDetails(ctx, pools)
}
