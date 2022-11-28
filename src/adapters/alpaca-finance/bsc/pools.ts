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
}

export async function getPoolsContracts(chain: Chain, fairLaunch: Contract) {
  const contracts: Contract[] = []

  const poolsLengthRes = await call({
    chain,
    target: fairLaunch.address,
    params: [],
    abi: abi.poolLength,
  })

  const poolsLength = parseInt(poolsLengthRes.output)

  const poolsInfoRes = await multicall({
    chain,
    calls: range(0, poolsLength).map((i) => ({
      target: fairLaunch.address,
      params: [i],
    })),
    abi: abi.poolInfo,
  })

  const poolsAddresses = poolsInfoRes.map((res) => res.output?.stakeToken)

  const underlyingsAddressesRes = await multicall({
    chain,
    calls: poolsAddresses.map((token: string) => ({
      target: token,
      params: [],
    })),
    abi: abi.token,
  })

  const { pools, underlyings } = await resolveERC20Details(chain, {
    pools: poolsAddresses,
    underlyings: underlyingsAddressesRes.map((res) => res.output),
  })

  for (let i = 0; i < pools.length; i++) {
    const poolRes = pools[i]
    const underlyingRes = underlyings[i]

    if (!isSuccess(poolRes) || !isSuccess(underlyingRes)) {
      continue
    }

    contracts.push({
      ...poolRes.output,
      pid: i,
      underlyings: [underlyingRes.output],
    })
  }

  return contracts
}
