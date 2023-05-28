import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

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
      { internalType: 'address', name: 'lptoken', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'rewards', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
      { internalType: 'address', name: 'factory', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'coins',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3123,
  },
} as const

export async function getConvexAltChainsPools(
  ctx: BaseContext,
  booster: Contract,
  curvePools: Contract[],
): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: booster.address, abi: abi.poolLength })

  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((i) => ({ target: booster.address, params: [i] } as const)),
    abi: abi.poolInfo,
  })

  const pools: Contract[] = mapSuccessFilter(poolInfosRes, (res) => {
    const [address, gauge, rewards, _shutdown, factory] = res.output

    return {
      chain: ctx.chain,
      address,
      lpToken: address,
      token: address,
      gauge,
      crvRewards: rewards,
      factory,
      rewards: booster.rewards,
    }
  })

  const fmtCvxPools = pools
    .map((pool) => {
      const fmtCurvePool = curvePools.find((curvePool) => curvePool.lpToken === pool.lpToken)
      return fmtCurvePool ? { ...pool, ...fmtCurvePool } : null
    })
    .filter(isNotNullish)

  return fmtCvxPools
}
