import type { BaseContext, Contract } from '@lib/adapter'
import { flatMapSuccess, range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  poolsInfo: {
    inputs: [],
    name: 'poolsInfo',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'id', type: 'address' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'bool', name: 'stable', type: 'bool' },
          { internalType: 'address', name: 'token0Address', type: 'address' },
          { internalType: 'address', name: 'token1Address', type: 'address' },
          { internalType: 'address', name: 'gaugeAddress', type: 'address' },
          { internalType: 'address', name: 'bribeAddress', type: 'address' },
          { internalType: 'address[]', name: 'bribeTokensAddresses', type: 'address[]' },
          { internalType: 'address', name: 'fees', type: 'address' },
          { internalType: 'uint256', name: 'totalSupply', type: 'uint256' },
          { internalType: 'address', name: 'feeDistAddress', type: 'address' },
        ],
        internalType: 'struct ISolidlyLens.Pool[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewards: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardsListLength: {
    inputs: [],
    name: 'rewardsListLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface GaugeContract extends Contract {
  token: `0x${string}`
  bribeAddress: `0x${string}`
  feesAddress: `0x${string}`
}

export async function getLensContracts(ctx: BaseContext, lens: Contract) {
  const poolsInfo = await call({ ctx, target: lens.address, abi: abi.poolsInfo })

  const pairs: Contract[] = (poolsInfo || []).map((pool: any) => ({
    chain: ctx.chain,
    address: pool.id,
    stable: pool.stable,
    underlyings: [pool.token0Address, pool.token1Address],
  }))

  const gauges: GaugeContract[] = (poolsInfo || []).map((pool: any) => ({
    chain: ctx.chain,
    address: pool.gaugeAddress,
    token: pool.id,
    stable: pool.stable,
    bribeAddress: pool.bribeAddress,
    feesAddress: pool.feeAddress,
    underlyings: [pool.token0Address, pool.token1Address],
    rewards: [],
  }))

  // gauges rewards
  const rewardsListLengthsRes = await multicall({
    ctx,
    calls: gauges.map((gauge) => ({ target: gauge.address })),
    abi: abi.rewardsListLength,
  })

  const rewardsRes = await multicall({
    ctx,
    calls: flatMapSuccess(rewardsListLengthsRes, (res, gaugeIdx) =>
      range(0, parseInt(res.output)).map((rewardIdx) => ({
        target: gauges[gaugeIdx].address,
        params: [rewardIdx],
      })),
    ),
    abi: abi.rewards,
  })

  let rewardCallIdx = 0
  for (let gaugeIdx = 0; gaugeIdx < gauges.length; gaugeIdx++) {
    const rewardsListLengthRes = rewardsListLengthsRes[gaugeIdx]
    if (!isSuccess(rewardsListLengthRes)) {
      continue
    }

    const rewardsLength = parseInt(rewardsListLengthRes.output)

    for (let rewardIdx = 0; rewardIdx < rewardsLength; rewardIdx++) {
      const rewardRes = rewardsRes[rewardCallIdx]
      if (isSuccess(rewardRes)) {
        gauges[gaugeIdx].rewards!.push(rewardRes.output)
      }

      rewardCallIdx++
    }
  }

  return { pairs, gauges }
}
