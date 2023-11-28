import { getPendlePools } from '@adapters/pendle/common/pool'
import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import {
  type GetLpTokenParams,
  getMasterChefPoolsContracts,
  type GetPoolsInfosParams,
} from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

const abi = {
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'market', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'rewardPool', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getRewardTokens: {
    inputs: [],
    name: 'getRewardTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEqPoolsContracts(ctx: BaseContext, masterChef: Contract): Promise<Contract[]> {
  const pools = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: getEquilibriaPoolsInfos,
    getLpToken: getEqLpToken,
  })

  const fmtPools = await getEqRewardsBalances(ctx, pools)

  return getPendleUnderlyings(ctx, fmtPools)
}

export async function getEquilibriaPoolsInfos(
  ctx: BaseContext,
  { masterChefAddress, poolLength, getLpToken }: GetPoolsInfosParams,
) {
  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: masterChefAddress, params: [idx] }) as const),
    abi: abi.poolInfo,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    const { address, pool, token }: any = Array.isArray(res.output) ? getLpToken!({ lpToken: res.output }) : res.output

    return { chain: ctx.chain, address, token, pool, pid: res.input.params![0] }
  })
}

export function getEqLpToken({ lpToken }: GetLpTokenParams) {
  return { address: lpToken[0], pool: lpToken[2], token: lpToken[1] }
}

async function getEqRewardsBalances(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const rewardsTokens = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.getRewardTokens,
  })

  return mapSuccessFilter(rewardsTokens, (res, index) => ({ ...pools[index], rewards: res.output as `0x${string}`[] }))
}

async function getPendleUnderlyings(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  // 1. We recover all the Pendle pools
  // 2. We merge the EqPools in order to recover underlyings from the PendlePools
  const pendlePools = await getPendlePools(ctx)

  return pools.reduce((acc: Contract[], pool) => {
    const matchingPendlePool = pendlePools.find(
      (pendlePool) => pendlePool.address.toLowerCase() === pool.address!.toLowerCase(),
    )

    const poolToAdd = matchingPendlePool ? { ...matchingPendlePool, ...pool } : pool
    acc.push(poolToAdd)

    return acc
  }, [])
}
