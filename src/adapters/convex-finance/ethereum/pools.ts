import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'
import { ETH_ADDR, type Token } from '@lib/token'

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
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      { internalType: 'address', name: 'stash', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolFromLPToken: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 2443,
  },
  getCoins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
  extraRewardsLength: {
    inputs: [],
    name: 'extraRewardsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  extraRewards: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'extraRewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
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

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  symbol: 'CRV',
  decimals: 18,
}

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

export async function getPoolsContracts(ctx: BaseContext, booster: Contract, registry: Contract): Promise<Contract[]> {
  const poolWithOnlyCommonRewards: Contract[] = []
  const poolWithExtraRewards: Contract[] = []

  const poolLength = await call({ ctx, target: booster.address, abi: abi.poolLength })

  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: booster.address, params: [idx] }) as const),
    abi: abi.poolInfo,
  })

  let pools: Contract[] = mapSuccessFilter(poolInfosRes, (res) => {
    const [lptoken, _token, gauge, crvRewards, stash] = res.output
    const pid = res.input.params[0]

    return {
      chain: ctx.chain,
      address: lptoken,
      lpToken: lptoken,
      gauge,
      crvRewards,
      stash,
      rewards: [CRV, CVX],
      pid,
    }
  })

  const poolAddresseRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: registry.address, params: [pool.lpToken] }) as const),
    abi: abi.getPoolFromLPToken,
  })

  pools = mapSuccessFilter(poolAddresseRes, (res, idx) => ({ ...pools[idx], pool: res.output }))

  const [coinsRes, extraRewardsLengthsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(({ pool }) => ({ target: registry.address, params: [pool] }) as const),
      abi: abi.getCoins,
    }),
    multicall({
      ctx,
      calls: pools.map(({ crvRewards }) => ({ target: crvRewards }) as const),
      abi: abi.extraRewardsLength,
    }),
  ])

  pools.forEach((pool, idx) => {
    const coinRes = coinsRes[idx]
    const extraRewardLengthsRes = extraRewardsLengthsRes[idx]

    if (!coinRes.success || !extraRewardLengthsRes.success) {
      return null
    }

    const underlyings: any = coinRes.output
      .map((address) => address.toLowerCase())
      // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
      .filter((address) => address !== ADDRESS_ZERO)
      // replace ETH alias
      .map((address) => (address === ETH_ADDR ? ADDRESS_ZERO : address))

    if (extraRewardLengthsRes.output > 0n) {
      poolWithExtraRewards.push({ ...pool, underlyings, extraRewardsLength: extraRewardLengthsRes.output })
    } else {
      poolWithOnlyCommonRewards.push({ ...pool, underlyings, extraRewardsLength: extraRewardLengthsRes.output })
    }

    return {
      ...pool,
      underlyings,
      extraRewardsLength: extraRewardLengthsRes.output,
    }
  })

  return [...poolWithOnlyCommonRewards, ...(await getExtraRewards(ctx, poolWithExtraRewards))]
}

async function getExtraRewards(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const extraRewardersRes = await multicall({
    ctx,
    calls: pools.flatMap((pool) =>
      rangeBI(0n, pool.extraRewardsLength).map((idx) => ({ target: pool.crvRewards, params: [idx] }) as const),
    ),
    abi: abi.extraRewards,
  })

  pools = mapItemsByTarget(pools, extraRewardersRes, 'crvRewards', 'rewarders')

  const extraRewardsTokensRes = await multicall({
    ctx,
    calls: pools.flatMap((pool) => pool.rewarders.map((res: any) => ({ target: res }))),
    abi: abi.rewardToken,
  })

  const tokensRes = await multicall({
    ctx,
    calls: mapSuccessFilter(extraRewardsTokensRes, (res) => ({ target: res.output })),
    abi: abi.token,
  })

  const extraRewardsTokensByTarget: { [key: string]: any } = {}
  extraRewardsTokensRes.forEach((res) => {
    extraRewardsTokensByTarget[res.input.target] = res
  })

  const tokensResByTarget: { [key: string]: any } = {}
  tokensRes.forEach((res) => {
    tokensResByTarget[res.input.target] = res
  })

  for (const pool of pools) {
    const newRewards = pool.rewarders.map((rewarder: `0x${string}`) => {
      const extraRewardsTokens = extraRewardsTokensByTarget[rewarder]
      const tokenRes = tokensResByTarget[extraRewardsTokens?.output]

      return tokenRes?.success ? tokenRes.output : extraRewardsTokens?.success ? extraRewardsTokens.output : undefined
    })

    pool.rewards = [...(pool.rewards || []), ...newRewards]
  }

  return pools
}

function mapItemsByTarget<T, K extends keyof T, L extends keyof T>(
  items: T[],
  mapItems: any,
  indexKey: L,
  outputKey: K,
): T[] {
  const groupedByTarget = mapItems.reduce(
    (acc: any, { input, success, output }: { input: any; success: any; output: any }) => {
      if (success) {
        const key = input.target
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(output)
      }
      return acc
    },
    {} as Record<string, string[]>,
  )

  for (const item of items) {
    ;(item[outputKey] as any) = groupedByTarget[item[indexKey] as any] || []
  }

  return items
}
