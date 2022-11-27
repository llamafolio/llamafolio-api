import { Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Category } from '@lib/category'
import { Chain } from '@lib/chains'
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
  chain: Chain
  factoryAddress: string
  // optional number of pairs
  length?: number
}

export async function getPairsContracts({ chain, factoryAddress, length }: getPairsContractsParams) {
  const allPairsLengthRes = await call({
    chain,
    abi: abi.allPairsLength,
    target: factoryAddress,
  })

  let allPairsLength = parseInt(allPairsLengthRes.output)
  if (length !== undefined) {
    allPairsLength = Math.min(allPairsLength, length)
  }

  const allPairsRes = await multicall({
    chain,
    calls: range(0, allPairsLength).map((_, i) => ({
      target: factoryAddress,
      params: [i],
    })),
    abi: abi.allPairs,
  })

  const contracts: Contract[] = allPairsRes.filter(isSuccess).map((res) => ({ chain, address: res.output }))

  return getPairsDetails(chain, contracts)
}

export async function getPairsDetails(chain: Chain, contracts: Contract[]): Promise<Contract[]> {
  const res: Contract[] = []

  const calls: Call[] = contracts.map((contract) => ({
    target: contract.address,
    params: [],
  }))

  const [token0sRes, token1sRes] = await Promise.all([
    multicall({
      chain,
      calls,
      abi: abi.token0,
    }),

    multicall({
      chain,
      calls,
      abi: abi.token1,
    }),
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
