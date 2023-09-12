import type { BaseContext, Contract } from '@lib/adapter'
import { flatMapSuccess, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { ETH_ADDR } from '@lib/token'

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
  extraRewards: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'extraRewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  extraRewardsLength: {
    inputs: [],
    name: 'extraRewardsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
  getUnderlyingsCoins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
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

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getPoolsContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const poolLengthBI = await call({ ctx, target: contract.address, abi: abi.poolLength })
  const poolLength = Number(poolLengthBI)

  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLengthBI).map((i) => ({ target: contract.address, params: [i] }) as const),
    abi: abi.poolInfo,
  })

  for (let idx = 0; idx < poolLength; idx++) {
    const poolInfoRes = poolInfosRes[idx]
    if (!poolInfoRes.success) {
      continue
    }

    const [address, _token, gauge, crvRewards] = poolInfoRes.output
    pools.push({
      chain: ctx.chain,
      address,
      gauge,
      // token,
      lpToken: address,
      crvRewards,
      pid: poolInfoRes.input.params[0],
      rewards: [CRV, CVX],
    })
  }

  const poolsAddressesRes = await multicall({
    ctx,
    calls: pools.map(({ address }) => ({ target: metaRegistry.address, params: [address] }) as const),
    abi: abi.getPoolFromLPToken,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const poolAddressRes = poolsAddressesRes[poolIdx]
    if (!poolAddressRes.success) {
      continue
    }

    pool.pool = poolAddressRes.output
  }

  const underlyingsRes = await multicall({
    ctx,
    calls: pools.map(({ pool }) => ({ target: metaRegistry.address, params: [pool] }) as const),
    abi: abi.getUnderlyingsCoins,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyingRes = underlyingsRes[poolIdx]
    if (!underlyingRes.success) {
      continue
    }

    ;(pool.underlyings as any) = underlyingRes.output
      .map((address) => address.toLowerCase())
      // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
      .filter((address) => address !== ADDRESS_ZERO)
      // replace ETH alias
      .map((address) => (address === ETH_ADDR ? ADDRESS_ZERO : address))
  }

  return getExtraRewards(ctx, pools)
}

const getExtraRewards = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const commonRewardsPools: Contract[] = []
  const extraRewardsPools: Contract[] = []

  const extraRewardsLengthsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({
      target: pool.crvRewards,
    })),
    abi: abi.extraRewardsLength,
  })

  const extraRewardsRes = await multicall({
    ctx,
    calls: flatMapSuccess(extraRewardsLengthsRes, (res) =>
      rangeBI(0n, res.output).map((idx) => ({ target: res.input.target, params: [idx] }) as const),
    ),
    abi: abi.extraRewards,
  })

  let extraRewardsCallIdx = 0
  for (let poolIdx = 0; poolIdx < extraRewardsLengthsRes.length; poolIdx++) {
    const extraRewardsLengthRes = extraRewardsLengthsRes[poolIdx]
    if (!extraRewardsLengthRes.success) {
      continue
    }

    const baseRewardPool: Contract = { ...pools[poolIdx], rewarder: [] as string[] }

    for (let extraRewardIdx = 0; extraRewardIdx < extraRewardsLengthRes.output; extraRewardIdx++) {
      const extraRewardRes = extraRewardsRes[extraRewardsCallIdx]
      if (extraRewardRes.success) {
        baseRewardPool.rewarder.push(extraRewardRes.output)
      }
      extraRewardsCallIdx++
    }

    if (baseRewardPool.rewarder.length === 0n) {
      commonRewardsPools.push(baseRewardPool)
      continue
    }

    extraRewardsPools.push(baseRewardPool)
  }

  const extraRewardsTokensRes = await multicall({
    ctx,
    calls: extraRewardsPools.flatMap((pool) => pool.rewarder.map((res: any) => ({ target: res }))),
    abi: abi.rewardToken,
  })

  const tokensRes = await multicall({
    ctx,
    calls: mapSuccessFilter(extraRewardsTokensRes, (res) => ({ target: res.output })),
    abi: abi.token,
  })

  let extraRewardsTokensIdx = 0
  for (let poolIdx = 0; poolIdx < extraRewardsPools.length; poolIdx++) {
    const pool = extraRewardsPools[poolIdx]

    for (let extraRewardIdx = 0; extraRewardIdx < pool.rewarder.length; extraRewardIdx++) {
      const extraRewardsTokens = extraRewardsTokensRes[extraRewardsTokensIdx]
      const tokenRes = tokensRes[extraRewardsTokensIdx]

      const rewards: any = tokenRes.success
        ? tokenRes.output
        : extraRewardsTokens.success
        ? extraRewardsTokens.output
        : undefined

      pool.rewards?.push(rewards)
      extraRewardsTokensIdx++
    }
  }

  return [...commonRewardsPools, ...extraRewardsPools]
}
