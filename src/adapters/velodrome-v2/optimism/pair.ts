import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  allPools: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPools',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  allPoolsLength: {
    inputs: [],
    name: 'allPoolsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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

export async function getVelodromePairsContracts(
  ctx: BaseContext,
  factory: Contract,
  voter: Contract,
): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: factory.address, abi: abi.allPoolsLength })

  const poolsAddresses = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: factory.address, params: [idx] }) as const),
    abi: abi.allPools,
  })

  const gaugesAddresses = await multicall({
    ctx,
    calls: mapSuccessFilter(poolsAddresses, (res) => ({ target: voter.address, params: [res.output] }) as const),
    abi: abi.gauges,
  })

  const pools: Contract[] = mapSuccessFilter(gaugesAddresses, (res) => ({
    chain: ctx.chain,
    address: res.input.params[0],
    gauge: res.output,
  }))

  return getPairsDetails(ctx, pools)
}
