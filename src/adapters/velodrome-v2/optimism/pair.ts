import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  allPools: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPools',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  allPoolsLength: {
    inputs: [],
    name: 'allPoolsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  gauges: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'gauges',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  gaugeToBribe: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'gaugeToBribe',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  gaugeToFees: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'gaugeToFees',
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
  rewards: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getVelodromePairsContracts(
  ctx: BaseContext,
  factory: Contract,
  voter: Contract,
): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: factory.address, abi: abi.allPoolsLength })

  const poolsAddresses = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: factory.address, params: [idx] }) as const),
    abi: abi.allPools,
  })

  const gaugesAddresses = await multicall({
    ctx,
    calls: mapSuccessFilter(poolsAddresses, (res) => ({ target: voter.address, params: [res.output] }) as const),
    abi: abi.gauges,
  })

  let pools: Contract[] = mapSuccessFilter(gaugesAddresses, (res) => {
    if (res.output === ADDRESS_ZERO) {
      return null
    }

    return {
      chain: ctx.chain,
      address: res.input.params[0],
      gauge: res.output,
    }
  }).filter(isNotNullish)

  const [feesRes, bribesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: voter.address, params: [pool.gauge] }) as const),
      abi: abi.gaugeToFees,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: voter.address, params: [pool.gauge] }) as const),
      abi: abi.gaugeToBribe,
    }),
  ])

  pools = pools
    .map((pool, idx) => {
      const feeRes = feesRes[idx]
      const bribeRes = bribesRes[idx]

      if (!feeRes.success || !bribeRes.success) {
        return null
      }

      return {
        ...pool,
        fee: feeRes.output,
        bribe: bribeRes.output,
      }
    })
    .filter(isNotNullish)

  const [rewardsFeesLengthRes, rewardsBribesLengthRes] = await Promise.all([
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.fee }) as const), abi: abi.rewardsListLength }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.bribe }) as const), abi: abi.rewardsListLength }),
  ])

  pools = pools
    .map((pool, idx) => {
      const rewardsFeeLengthRes = rewardsFeesLengthRes[idx]
      const rewardsBribeLengthRes = rewardsBribesLengthRes[idx]

      if (!rewardsFeeLengthRes.success || !rewardsBribeLengthRes.success) {
        return null
      }

      return {
        ...pool,
        feeLength: rewardsFeeLengthRes.output,
        bribeLength: rewardsBribeLengthRes.output,
      }
    })
    .filter(isNotNullish)

  const [rewardsFeesAddressesRes, rewardsBribesAddressesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        rangeBI(0n, pool.feeLength).map((idx) => ({ target: pool.fee, params: [idx] }) as const),
      ),
      abi: abi.rewards,
    }),
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        rangeBI(0n, pool.bribeLength).map((idx) => ({ target: pool.bribe, params: [idx] }) as const),
      ),
      abi: abi.rewards,
    }),
  ])

  let [feePointer, bribePointer] = [0, 0]

  pools = pools.map((pool) => {
    const feeLength = Number(pool.feeLength)
    const bribeLength = Number(pool.bribeLength)

    const feeTokens = rewardsFeesAddressesRes.slice(feePointer, feePointer + feeLength).map((res) => res.output)
    const bribeTokens = rewardsBribesAddressesRes
      .slice(bribePointer, bribePointer + bribeLength)
      .map((res) => res.output)

    feePointer += feeLength
    bribePointer += bribeLength

    return { ...pool, feeTokens, bribeTokens }
  })

  for (const pool of pools) {
    if (pool.feeTokens.length > 0 && pool.bribeTokens > 0) {
      const [feeTokens, bribeTokens] = await Promise.all([
        getERC20Details(ctx, pool.feeTokens),
        getERC20Details(ctx, pool.bribeTokens),
      ])

      pool.feeTokens = feeTokens
      pool.bribeTokens = bribeTokens
    }
  }

  return getPairsDetails(ctx, pools)
}
