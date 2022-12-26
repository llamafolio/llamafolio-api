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

  const tokensRes = await multicall({
    chain,
    calls: poolsInfosRes.map((res) => ({
      target: res.success ? res.output.lpToken : undefined,
      params: [],
    })),
    abi: abi.token,
  })

  for (let pid = 0; pid < poolsLength; pid++) {
    const poolInfoRes = poolsInfosRes[pid]
    const tokenRes = tokensRes[pid]

    if (!isSuccess(poolInfoRes) || !isSuccess(tokenRes)) {
      continue
    }

    pools.push({
      chain,
      address: poolInfoRes.output.lpToken,
      yieldKey: tokenRes.output,
      underlyings: [tokenRes.output],
      rewards: lpStaking.rewards,
      pid,
    })
  }

  return pools
}
