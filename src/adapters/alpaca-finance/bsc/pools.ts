import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'stakeToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'lastRewardBlock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'accAlpacaPerShare',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'accAlpacaPerShareTilBonusEnd',
        type: 'uint256',
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

export async function getPoolsContracts(ctx: BaseContext, fairLaunch: Contract) {
  const contracts: Contract[] = []

  const poolsLength = await call({
    ctx,
    target: fairLaunch.address,
    abi: abi.poolLength,
  })

  const poolsInfoRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolsLength).map((i) => ({ target: fairLaunch.address, params: [i] } as const)),
    abi: abi.poolInfo,
  })

  const poolsAddresses = mapSuccessFilter(poolsInfoRes, (res) => res.output[0])

  const underlyingsAddressesRes = await multicall({
    ctx,
    calls: poolsAddresses.map((token) => ({
      target: token,
    })),
    abi: abi.token,
  })

  for (let poolIdx = 0; poolIdx < poolsAddresses.length; poolIdx++) {
    const underlyingRes = underlyingsAddressesRes[poolIdx]

    contracts.push({
      chain: ctx.chain,
      address: poolsAddresses[poolIdx],
      pid: poolIdx,
      underlyings: underlyingRes.success ? [underlyingRes.output] : undefined,
    })
  }

  return contracts
}
