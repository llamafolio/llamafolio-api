import { Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { resolveERC20Details } from '@lib/erc20'
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

  const getPoolsLength = await call({
    chain,
    target: lpStaking.address,
    params: [],
    abi: abi.poolLength,
  })

  const getPoolsInfos = await multicall({
    chain,
    calls: range(0, getPoolsLength.output).map((i) => ({
      target: lpStaking.address,
      params: [i],
    })),
    abi: abi.poolInfos,
  })

  const poolsInfos = getPoolsInfos.filter((res) => res.success).map((res) => res.output)

  const getTokens = await multicall({
    chain,
    calls: poolsInfos.map((token) => ({
      target: token.lpToken,
      params: [],
    })),
    abi: abi.token,
  })

  const tokens = await resolveERC20Details(chain, {
    tokens: getTokens.map((res) => res.output),
  })

  for (let i = 0; i < getPoolsLength.output; i++) {
    const token = tokens.tokens[i]

    if (!isSuccess(token) || !lpStaking.rewards) {
      continue
    }

    pools.push({
      chain,
      address: token.output.address,
      symbol: token.output.symbol,
      decimals: token.output.decimals,
      yieldKey: token.output.address,
      rewards: lpStaking.rewards,
    })
  }

  return pools
}
