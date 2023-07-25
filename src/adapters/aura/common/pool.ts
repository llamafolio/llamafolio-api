import type { BaseContext, Contract } from '@lib/adapter'
import { keyBy, mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

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
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  extraRewards: {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'extraRewards',
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
  extraRewardsLength: {
    inputs: [],
    name: 'extraRewardsLength',
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
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  baseToken: {
    inputs: [],
    name: 'baseToken',
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
} as const

const BAL: Token = {
  chain: 'ethereum',
  address: '0xba100000625a3754423978a60c9317c58a424e3D',
  decimals: 18,
  symbol: 'BAL',
}

export async function getAuraPools(ctx: BaseContext, booster: Contract, vault: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const poolLengthBI = await call({ ctx, target: booster.address, abi: abi.poolLength })

  const poolLength = Number(poolLengthBI)

  const calls: Call<typeof abi.poolInfo>[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: booster.address, params: [BigInt(idx)] })
  }

  const poolsInfosRes = await multicall({ ctx, calls, abi: abi.poolInfo })

  for (let idx = 0; idx < poolLength; idx++) {
    const poolsInfoRes = poolsInfosRes[idx]

    if (!poolsInfoRes.success) {
      continue
    }

    const [lptoken, _token, _gauge, crvRewards, _stash, _shutdown] = poolsInfoRes.output

    pools.push({
      chain: ctx.chain,
      address: lptoken,
      pool: lptoken,
      lpToken: lptoken,
      gauge: crvRewards,
      rewards: [BAL],
    })
  }

  const rewardedPools = await getAuraExtraRewards(ctx, pools)

  return getAuraPoolsId(ctx, rewardedPools, vault)
}

const getAuraPoolsId = async (ctx: BaseContext, pools: Contract[], vault: Contract): Promise<Contract[]> => {
  const poolsWithIds: Contract[] = []

  const calls: Call<typeof abi.getPoolId>[] = []
  for (const pool of pools) {
    calls.push({ target: pool.address })
  }

  const poolIdsRes = await multicall({ ctx, calls, abi: abi.getPoolId })

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const poolIdRes = poolIdsRes[idx]

    if (!poolIdRes.success) {
      continue
    }

    poolsWithIds.push({
      ...pool,
      id: poolIdRes.output,
    })
  }

  return getAuraPoolsUnderlyings(ctx, poolsWithIds, vault)
}

const getAuraPoolsUnderlyings = async (ctx: BaseContext, pools: Contract[], vault: Contract): Promise<Contract[]> => {
  const poolsWithUnderlyings: Contract[] = []

  const calls: Call<typeof abi.getPoolTokens>[] = []
  for (const pool of pools) {
    calls.push({ target: vault.address, params: [pool.id] })
  }

  const underlyingsRes = await multicall({ ctx, calls, abi: abi.getPoolTokens })

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const underlyingRes = underlyingsRes[idx]

    if (!underlyingRes.success) {
      continue
    }

    const [tokens]: any = underlyingRes.output

    poolsWithUnderlyings.push({
      ...pool,
      underlyings: tokens,
    })
  }

  return unwrapPoolsAsUnderlyings(poolsWithUnderlyings)
}

const unwrapPoolsAsUnderlyings = (pools: Contract[]) => {
  const unwrappedPools: Contract[] = []

  const poolByAddress = keyBy(pools, 'address', { lowercase: true })

  for (const pool of pools) {
    const underlyings = pool.underlyings as Contract[]
    if (!underlyings) {
      continue
    }

    const unwrappedUnderlyings = underlyings.map((address) => poolByAddress[address.toLowerCase()] || address)

    unwrappedPools.push({
      ...pool,
      underlyings: unwrappedUnderlyings,
    })
  }

  return unwrappedPools
}

const getAuraExtraRewards = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const standardRewardsPools: Contract[] = []
  const extraRewardsPools: Contract[] = []

  const extraRewardsLengthRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.gauge }) as const),
    abi: abi.extraRewardsLength,
  })

  const extraRewardsRes = await multicall({
    ctx,
    calls: mapSuccessFilter(
      extraRewardsLengthRes,
      (res) => ({ target: res.input.target, params: [res.output - 1n] }) as const,
    ),
    abi: abi.extraRewards,
  })

  pools.forEach((pool, idx) => {
    const extraRewardRes = extraRewardsRes[idx].success ? extraRewardsRes[idx].output : undefined
    pool.rewarder = extraRewardRes

    if (pool.rewarder) {
      extraRewardsPools.push(pool)
    } else {
      standardRewardsPools.push(pool)
    }
  })

  const stashRewardsRes = await multicall({
    ctx,
    calls: extraRewardsPools.map((pool) => ({ target: pool.rewarder }) as const),
    abi: abi.rewardToken,
  })

  const baseTokensRes = await multicall({
    ctx,
    calls: mapSuccessFilter(stashRewardsRes, (res) => ({ target: res.output }) as const),
    abi: abi.baseToken,
  })

  extraRewardsPools.forEach((pool, idx) => {
    const baseTokenRes: any = baseTokensRes[idx]

    if (!baseTokenRes) {
      return
    }

    pool.rewards?.push(baseTokenRes.output)
  })

  return [...standardRewardsPools, ...extraRewardsPools]
}
