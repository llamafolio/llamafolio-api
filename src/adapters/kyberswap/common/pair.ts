import type { Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails, type Pair, type getPairsContractsParams } from '@lib/uniswap/v2/factory'

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
} as const

export async function getKyberswapPairs({ ctx, factoryAddress, offset = 0, limit = 100 }: getPairsContractsParams) {
  const allPoolsLengthRes = await call({ ctx, target: factoryAddress, abi: abi.allPoolsLength })

  const allPoolsLength = Number(allPoolsLengthRes)
  const end = Math.min(offset + limit, allPoolsLength)
  const pids = rangeBI(BigInt(offset), BigInt(end))

  const allPairs = await multicall({
    ctx,
    calls: pids.map((idx) => ({ target: factoryAddress, params: [idx] }) as const),
    abi: abi.allPools,
  })

  const rawPairs: Contract[] = mapSuccessFilter(allPairs, (res) => ({ chain: ctx.chain, address: res.output }))
  const pairs = (await getPairsDetails(ctx, rawPairs)) as Pair[]

  return { pairs, allPoolsLength }
}
