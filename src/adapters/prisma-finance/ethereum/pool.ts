import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'lptoken', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      { internalType: 'address', name: 'stash', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const convexBooster: Contract = {
  chain: 'ethereum',
  address: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
}

export async function getConvexPools(ctx: BaseContext, pools: Contract[], curvePools: Contract[]): Promise<Contract[]> {
  const poolInfos = await multicall({
    ctx,
    calls: pools.map(({ pid }) => ({ target: convexBooster.address, params: [pid] }) as const),
    abi: abi.poolInfo,
  })

  const contracts: Contract[] = mapSuccessFilter(poolInfos, (res, idx) => {
    const [lpToken, token, gauge, crvRewards, stash] = res.output

    return {
      ...pools[idx],
      lpToken,
      token,
      gauge,
      crvRewards,
      stash,
    }
  })

  const mergedAndFilteredPools: Contract[] = contracts.reduce((acc: Contract[], contracts) => {
    const matchingCurvePool = curvePools.find((curvePool) => curvePool.lpToken === contracts.lpToken)
    if (matchingCurvePool) {
      acc.push({ ...matchingCurvePool, ...contracts })
    }
    return acc
  }, [])

  return mergedAndFilteredPools
}

export async function getCurvePools(_ctx: BaseContext, pools: Contract[], curvePools: Contract[]): Promise<Contract[]> {
  const mergedAndFilteredPools: Contract[] = pools.reduce((acc: Contract[], contracts) => {
    const matchingCurvePool = curvePools.find((curvePool) => curvePool.lpToken === contracts.lpToken)
    if (matchingCurvePool) {
      acc.push({ ...matchingCurvePool, ...contracts })
    }
    return acc
  }, [])

  return mergedAndFilteredPools
}
