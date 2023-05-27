import type { BaseContext, Contract } from '@lib/adapter'
import { groupBy, range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

import { getBalancerProvider } from './providers/balancerProvider'
import { getGroProvider } from './providers/groProvider'
import { getSushiProvider } from './providers/sushiProvider'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: 'pools', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'uint256', name: 'accGroPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
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

export async function getGroContracts(ctx: BaseContext, masterchef: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const poolLengthBI = await call({ ctx, target: masterchef.address, abi: abi.poolLength })
  const poolLength = Number(poolLengthBI)

  const poolInfosRes = await multicall({
    ctx,
    calls: range(0, poolLength).map((idx) => ({ target: masterchef.address, params: [BigInt(idx)] } as const)),
    abi: abi.poolInfo,
  })

  for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
    const poolInfoRes = poolInfosRes[poolIdx]
    if (!poolInfoRes.success) {
      continue
    }

    const [_accGroPerShare, _allocPoint, _lastRewardBlock, lpToken] = poolInfoRes.output

    contracts.push({
      chain: ctx.chain,
      address: lpToken,
      lpToken,
      pid: poolIdx,
      rewards: masterchef.rewards,
    })
  }

  return getUnderlyingsContracts(ctx, contracts)
}

type Provider = (ctx: BaseContext, pools: Contract[]) => Promise<Contract[]>

const providers: Record<string, Provider | undefined> = {
  // https://docs.gro.xyz/gro-docs/contract-address/gro-tokens
  0: getGroProvider,
  1: getSushiProvider,
  2: getSushiProvider,
  3: getGroProvider,
  4: getGroProvider,
  5: getBalancerProvider,
  6: getGroProvider,
}

const getUnderlyingsContracts = async (ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> => {
  // resolve underlyings
  const poolsByPid = groupBy(contracts, 'pid')

  return (
    await Promise.all(
      Object.keys(poolsByPid).map((pid) => {
        const providerFn = providers[pid]
        if (!providerFn) {
          return poolsByPid[pid] as Contract[]
        }

        return providerFn(ctx, poolsByPid[pid] as Contract[])
      }),
    )
  ).flat()
}

export async function getYieldContracts(ctx: BaseContext, pools: `0x${string}`[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const underlyingsRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool })), abi: abi.token })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyingRes = underlyingsRes[poolIdx]

    if (!underlyingRes.success) {
      continue
    }

    contracts.push({ chain: ctx.chain, address: pool, underlyings: [underlyingRes.output] })
  }

  return contracts
}
