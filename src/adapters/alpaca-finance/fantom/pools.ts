import type { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakingToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'stakingToken',
    outputs: [
      {
        internalType: 'contract IERC20Upgradeable',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPoolsContracts(ctx: BaseContext, miniFairLaunch: Contract) {
  const contracts: Contract[] = []

  const poolsLengthBI = await call({
    ctx,
    target: miniFairLaunch.address,
    abi: abi.poolLength,
  })

  const poolsLength = Number(poolsLengthBI)

  const poolsInfoRes = await multicall({
    ctx,
    calls: range(0, poolsLength).map((i) => ({
      target: miniFairLaunch.address,
      params: [i],
    })),
    abi: abi.stakingToken,
  })

  const poolsAddresses = poolsInfoRes.map((res) => res.output)

  const underlyingsAddressesRes = await multicall({
    ctx,
    calls: poolsAddresses.map((token: string) => ({
      target: token,
      params: [],
    })),
    abi: abi.token,
  })

  for (let poolIdx = 0; poolIdx < poolsAddresses.length; poolIdx++) {
    const underlyingRes = underlyingsAddressesRes[poolIdx]

    contracts.push({
      chain: ctx.chain,
      address: poolsAddresses[poolIdx],
      pid: poolIdx,
      underlyings: isSuccess(underlyingRes) ? [underlyingRes.output] : undefined,
    })
  }

  return contracts
}
