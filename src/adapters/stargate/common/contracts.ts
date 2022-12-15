import { Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  stargate: {
    inputs: [],
    name: 'stargate',
    outputs: [
      {
        internalType: 'contract StargateToken',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  poolInfos: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accStargatePerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  token: {
    inputs: [],
    name: 'token',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPoolsContracts(chain: Chain, lpStaking: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const poolsLengthRes = await call({
    chain,
    target: lpStaking.address,
    params: [],
    abi: abi.poolLength,
  })

  const poolsLength = parseInt(poolsLengthRes.output)

  const poolsInfosRes = await multicall({
    chain,
    calls: range(0, poolsLength).map((i) => ({
      target: lpStaking.address,
      params: [i],
    })),
    abi: abi.poolInfos,
  })

  const poolsInfos = poolsInfosRes.filter(isSuccess).map((res) => res.output)

  const tokensRes = await multicall({
    chain,
    calls: poolsInfos.map((token) => ({
      target: token.lpToken,
      params: [],
    })),
    abi: abi.token,
  })

  let tokenIdx = 0
  for (let poolInfoIdx = 0; poolInfoIdx < poolsLength; poolInfoIdx++) {
    const poolInfoRes = poolsInfosRes[poolInfoIdx]
    const tokenRes = tokensRes[tokenIdx]

    if (!isSuccess(poolInfoRes)) {
      continue
    }

    if (!isSuccess(tokenRes)) {
      tokenIdx++
      continue
    }

    pools.push({
      chain,
      address: tokenRes.output,
      yieldKey: tokenRes.output,
      underlyings: [tokenRes.output],
      rewards: lpStaking.rewards,
    })

    tokenIdx++
  }

  return pools
}
