import type { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { ETH_ADDR } from '@lib/token'
import { isSuccess } from '@lib/type'

const abiPools = {
  pool_count: {
    stateMutability: 'view',
    type: 'function',
    name: 'pool_count',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  pool_list: {
    stateMutability: 'view',
    type: 'function',
    name: 'pool_list',
    inputs: [{ name: '_index', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  get_gauge: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauge',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  get_gauge_type: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauge_type',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'int128' }],
  },
  get_pool_name: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_name',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
  },
  get_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_lp_token',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  get_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
  get_underlying_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
} as const

const abiGauges = {
  n_gauges: {
    name: 'n_gauges',
    outputs: [{ type: 'int128', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 1991,
  },
  gauge_controller: {
    stateMutability: 'view',
    type: 'function',
    name: 'gauge_controller',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    gas: 2078,
  },
  gauges: {
    name: 'gauges',
    outputs: [{ type: 'address', name: '' }],
    inputs: [{ type: 'uint256', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
    gas: 2160,
  },
  lp_token: {
    name: 'lp_token',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 1481,
  },
  get_gauges: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauges',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [
      { name: '', type: 'address[10]' },
      { name: '', type: 'int128[10]' },
    ],
    gas: 20157,
  },
  get_gauge: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauge',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3089,
  },
  reward_tokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3787,
  },
  claimable_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_addr', type: 'address' },
      { name: '_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3034,
  },
} as const

export async function getPoolsContracts(ctx: BaseContext, registry: Contract) {
  const poolContracts: Contract[] = []
  const pools: Contract[] = []

  const poolsCountBI = await call({
    ctx,
    target: registry.address,
    abi: abiPools.pool_count,
  })

  const poolsCounts = Number(poolsCountBI)

  // lists of pools
  const poolsCalls: Call[] = range(0, poolsCounts).map((i) => ({
    target: registry.address,
    params: [i],
  }))

  const poolsLists = await multicall({ ctx, calls: poolsCalls, abi: abiPools.pool_list })

  for (let poolsIdx = 0; poolsIdx < poolsLists.length; poolsIdx++) {
    const poolList = poolsLists[poolsIdx]

    if (!isSuccess(poolList)) {
      continue
    }

    pools.push({ chain: ctx.chain, address: poolList.output, pool: poolList.output })
  }

  // pools details (gauge, gauge_type, lpTokens, coins, underlyings)
  const poolsDetailsCalls: Call[] = pools.map((pool) => ({
    target: registry.address,
    params: [pool.address],
  }))

  const [gaugesRes, gaugesTypesRes, poolsNamesRes, lpTokensRes, coinsRes, underlyingsRes] = await Promise.all([
    multicall({ ctx, calls: poolsDetailsCalls, abi: abiPools.get_gauge }),
    multicall({ ctx, calls: poolsDetailsCalls, abi: abiPools.get_gauge_type }),
    multicall({ ctx, calls: poolsDetailsCalls, abi: abiPools.get_pool_name }),
    multicall({ ctx, calls: poolsDetailsCalls, abi: abiPools.get_lp_token }),
    multicall({ ctx, calls: poolsDetailsCalls, abi: abiPools.get_coins }),
    multicall({ ctx, calls: poolsDetailsCalls, abi: abiPools.get_underlying_coins }),
  ])

  let poolIdx = 0
  for (let callIdx = 0; callIdx < pools.length; callIdx++) {
    const gaugeRes = gaugesRes[callIdx]
    const gaugeTypeRes = gaugesTypesRes[callIdx]
    const poolNameRes = poolsNamesRes[callIdx]
    const lpTokenRes = lpTokensRes[callIdx]
    const coinRes = coinsRes[callIdx]
    const underlyingRes = underlyingsRes[callIdx]

    if (
      !isSuccess(gaugeRes) ||
      !isSuccess(gaugeTypeRes) ||
      !isSuccess(poolNameRes) ||
      !isSuccess(lpTokenRes) ||
      // registry responses seem wrong for these addresses since it returns 1e24 number with only 8 decimals or 6 decimals underlyings
      lpTokenRes.output === '0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2' || // compound-gauge
      lpTokenRes.output === '0x5282a4eF67D9C33135340fB3289cc1711c13638C' || // ib3CRV-gauge
      !isSuccess(coinRes) ||
      !isSuccess(underlyingRes)
    ) {
      poolIdx++
      continue
    }

    poolContracts.push({
      ...pools[poolIdx],
      address: lpTokenRes.output,
      name: poolNameRes.output,
      symbol: poolNameRes.output,
      gauge: gaugeRes.output,
      gaugeType: gaugeTypeRes.output,
      lpToken: lpTokenRes.output,
      yieldKey: lpTokenRes.output,
      tokens: coinRes.output
        .map((address: string) => address.toLowerCase())
        // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
        .filter((address: string) => address !== ADDRESS_ZERO)
        // replace ETH alias
        .map((address: string) => (address === ETH_ADDR ? ADDRESS_ZERO : address)),
      underlyings: underlyingRes.output
        .map((address: string) => address.toLowerCase())
        // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
        .filter((address: string) => address !== ADDRESS_ZERO)
        // replace ETH alias
        .map((address: string) => (address === ETH_ADDR ? ADDRESS_ZERO : address)),
    })

    poolIdx++
  }

  return poolContracts
}

export async function getGaugesContracts(ctx: BaseContext, pools: Contract[], CRV: Token) {
  const gauges: Contract[] = pools
    .filter((pool) => pool.gauge !== ADDRESS_ZERO)
    .map((pool) => ({ ...pool, address: pool.gauge }))

  const gaugesRewardsCalls: Call[] = []
  for (let gaugeIdx = 0; gaugeIdx < gauges.length; gaugeIdx++) {
    for (let rewardIdx = 0; rewardIdx < 4; rewardIdx++) {
      gaugesRewardsCalls.push({ target: gauges[gaugeIdx].gauge, params: [rewardIdx] })
    }
  }

  const rewardTokensRes = await multicall({ ctx, calls: gaugesRewardsCalls, abi: abiGauges.reward_tokens })

  let callIdx = 0
  for (let gaugeIdx = 0; gaugeIdx < gauges.length; gaugeIdx++) {
    const rewards = [CRV]

    for (let rewardIdx = 0; rewardIdx < 4; rewardIdx++) {
      const rewardTokenRes = rewardTokensRes[callIdx]
      if (isSuccess(rewardTokenRes) && rewardTokenRes.output !== ADDRESS_ZERO) {
        rewards.push(rewardTokenRes.output)
      }
      callIdx++
    }

    gauges[gaugeIdx].rewards = rewards
  }

  return gauges
}
