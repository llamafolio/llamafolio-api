import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Category } from '@lib/category'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

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
}

export interface getPairsContractsParams {
  ctx: BaseContext
  factoryAddress: string
  offset?: number
  limit?: number
}

export async function getPairsContracts({ ctx, factoryAddress, offset = 0, limit = 100 }: getPairsContractsParams) {
  const allPairsLengthRes = await call({
    chain: ctx.chain,
    abi: abi.allPairsLength,
    target: factoryAddress,
  })

  const allPairsLength = parseInt(allPairsLengthRes.output)
  const end = Math.min(offset + limit, allPairsLength)

  const allPairsRes = await multicall({
    chain: ctx.chain,
    calls: range(offset, end).map((_, i) => ({
      target: factoryAddress,
      params: [i],
    })),
    abi: abi.allPairs,
  })

  const contracts: Contract[] = allPairsRes.filter(isSuccess).map((res) => ({ chain: ctx.chain, address: res.output }))

  return getPairsDetails(ctx, contracts)
}

export async function getPairsDetails(ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> {
  const res: Contract[] = []

  const calls: Call[] = contracts.map((contract) => ({
    target: contract.address,
    params: [],
  }))

  const [token0sRes, token1sRes] = await Promise.all([
    multicall({ chain: ctx.chain, calls, abi: abi.token0 }),
    multicall({ chain: ctx.chain, calls, abi: abi.token1 }),
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
