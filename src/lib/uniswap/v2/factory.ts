import type { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isNotNullish, isSuccess } from '@lib/type'

const abi = {
  allPairsLength: {
    constant: true,
    inputs: [],
    name: 'allPairsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  allPairs: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPairs',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  token0: {
    constant: true,
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    constant: true,
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface getPairsContractsParams {
  ctx: BaseContext
  factoryAddress: string
  allPairsLengthABI?: object
  offset?: number
  limit?: number
}

export interface Pair extends Contract {
  pid: number
  underlyings: [string, string]
}

export async function getPairsContracts({
  ctx,
  factoryAddress,
  offset = 0,
  limit = 100,
  allPairsLengthABI = abi.allPairsLength,
}: getPairsContractsParams) {
  const allPairsLengthRes = await call({
    ctx,
    abi: allPairsLengthABI,
    target: factoryAddress,
  })

  const allPairsLength = Number(allPairsLengthRes)
  const end = Math.min(offset + limit, allPairsLength)

  const pids = range(offset, end)

  const allPairsRes = await multicall({
    ctx,
    calls: pids.map((idx) => ({
      target: factoryAddress,
      params: [idx],
    })),
    abi: abi.allPairs,
  })

  const contracts: Contract[] = allPairsRes
    .map((res, idx) => (res.success ? { chain: ctx.chain, address: res.output, pid: pids[idx] } : null))
    .filter(isNotNullish)

  const pairs = (await getPairsDetails(ctx, contracts)) as Pair[]

  return { pairs, allPairsLength }
}

export async function getPairsDetails<T extends Contract>(ctx: BaseContext, contracts: T[]): Promise<T[]> {
  const res: T[] = []

  const calls: Call[] = contracts.map((contract) => ({
    target: contract.address,
    params: [],
  }))

  const [token0sRes, token1sRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.token0 }),
    multicall({ ctx, calls, abi: abi.token1 }),
  ])

  for (let i = 0; i < calls.length; i++) {
    const token0Res = token0sRes[i]
    const token1Res = token1sRes[i]

    if (!isSuccess(token0Res) || !isSuccess(token1Res)) {
      continue
    }

    res.push({
      ...contracts[i],
      category: 'lp' as Category,
      underlyings: [token0Res.output, token1Res.output],
    })
  }

  return res
}
