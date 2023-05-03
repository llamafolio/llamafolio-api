import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish, isSuccess } from '@lib/type'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const pancakeStableSwapInfos: Contract = {
  chain: 'bsc',
  address: '0xa680d27f63Fa5E213C502d1B3Ca1EB6a3C1b31D6',
}

const abi = {
  pairLength: {
    inputs: [],
    name: 'pairLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  swapPairContract: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'swapPairContract',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  coins: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'coins',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [
      {
        internalType: 'uint256',
        name: 'pools',
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
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accSushiPerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      {
        internalType: 'uint256',
        name: '_pid',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'pendingSushi',
    outputs: [
      {
        internalType: 'uint256',
        name: 'pending',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract PancakeStableSwapLP', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'balances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  calc_coins_amount: {
    inputs: [
      { internalType: 'address', name: '_swap', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'calc_coins_amount',
    outputs: [{ internalType: 'uint256[2]', name: '', type: 'uint256[2]' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const getPancakeStablePairs = async (ctx: BaseContext, factory: Contract) => {
  const res: Contract[] = []
  const masterchefStablePools: Contract[] = []

  const poolLengthRes = await call({ ctx, target: factory.address, params: [], abi: abi.pairLength })

  const poolLength = parseInt(poolLengthRes.output)

  const calls: Call[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: factory.address, params: [idx] })
  }

  const poolInfosRes = await multicall({ ctx, calls, abi: abi.swapPairContract })

  const lpTokenCalls: Call[] = []
  for (let idx = 0; idx < poolInfosRes.length; idx++) {
    const poolInfoRes = poolInfosRes[idx]
    if (!isSuccess(poolInfoRes)) {
      continue
    }

    lpTokenCalls.push({ target: poolInfoRes.output, params: [] })
  }

  const lpTokensRes = await multicall({ ctx, calls: lpTokenCalls, abi: abi.token })

  for (let poolIdx = 0; poolIdx < lpTokensRes.length; poolIdx++) {
    const lpTokenRes = lpTokensRes[poolIdx]
    if (!isSuccess(lpTokenRes)) {
      continue
    }

    masterchefStablePools.push({
      chain: ctx.chain,
      address: lpTokenRes.input.target,
      lpToken: lpTokenRes.output,
    })
  }

  for (const masterchefStablePool of masterchefStablePools) {
    const calls = range(0, 2).map((i) => ({ target: masterchefStablePool.address, params: i }))

    const coinsRes = await multicall({ ctx, calls, abi: abi.coins })

    const coins = coinsRes.filter(isSuccess).map((res) => res.output)

    res.push({
      ...masterchefStablePool,
      category: 'lp',
      underlyings: coins,
      symbol: `Cake-Stable-LP`,
      decimals: 18,
    })
  }

  return res
}

const getMasterChefLpToken = async (
  ctx: BaseContext,
  pairs: Pair[],
  masterchef: Contract,
  factory: Contract,
): Promise<Contract[]> => {
  const pools: Contract[] = []

  const [masterchefStablePools, poolLengthRes] = await Promise.all([
    getPancakeStablePairs(ctx, factory),
    call({ ctx, target: masterchef.address, params: [], abi: abi.poolLength }),
  ])

  const poolLength = parseInt(poolLengthRes.output)

  const calls: Call[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: masterchef.address, params: [idx] })
  }

  const poolInfosRes = await multicall({ ctx, calls, abi: abi.lpToken })

  for (let poolIdx = 0; poolIdx < poolInfosRes.length; poolIdx++) {
    const poolInfoRes = poolInfosRes[poolIdx]
    if (!isSuccess(poolInfoRes)) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: poolInfoRes.output,
      lpToken: poolInfoRes.output,
      pid: poolInfoRes.input.params[0],
    })
  }

  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pairs) {
    pairByAddress[pair.address.toLowerCase()] = pair
  }

  const stablePairByAddress: { [key: string]: Contract } = {}
  for (const masterchefStablePool of masterchefStablePools) {
    stablePairByAddress[masterchefStablePool.lpToken.toLowerCase()] = masterchefStablePool
  }

  const masterchefPools = pools
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]
      const stablePair = stablePairByAddress[pool.lpToken.toLowerCase()]

      if (!pair && !stablePair) {
        return null
      }

      if (pair) {
        const contract: Contract = { ...pair, pid: pool.pid, category: 'farm', stablePool: false }
        return contract
      }

      if (stablePair) {
        const contract: Contract = { ...stablePair, pid: pool.pid, category: 'farm', stablePool: true }
        return contract
      }
    })
    .filter(isNotNullish)

  return masterchefPools
}

type MasterchefPoolsBalancesParams = Balance & {
  stablePool: boolean
  lpToken: string
}

const getPancakeUnderlyingsMasterChefPoolsBalances = async (
  ctx: BalancesContext,
  masterchefPoolsBalances: Contract[],
  pancakewapInfos: Contract,
) => {
  const underlyiedPoolsBalances: Balance[] = []

  const calls: Call[] = []
  for (const masterchefPoolsBalance of masterchefPoolsBalances) {
    calls.push({
      target: pancakewapInfos.address,
      params: [masterchefPoolsBalance.address, masterchefPoolsBalance.amount.toString()],
    })
  }

  const underlyingsBalanceInStablePoolsRes = await multicall({ ctx, calls, abi: abi.calc_coins_amount })
  const underlyingsBalanceInStablePools = underlyingsBalanceInStablePoolsRes.filter(isSuccess).map((res) => res.output)

  for (let idx = 0; idx < masterchefPoolsBalances.length; idx++) {
    const masterchefPoolBalances = masterchefPoolsBalances[idx]
    const underlyingsBalanceInStablePool = underlyingsBalanceInStablePools[idx]
    const underlyings = masterchefPoolBalances.underlyings as string[]
    if (!underlyings) {
      continue
    }

    const underlying0: Contract = {
      chain: ctx.chain,
      address: underlyings[0],
      decimals: 18,
      amount: BigNumber.from(underlyingsBalanceInStablePool[0]),
    }

    const underlying1: Contract = {
      chain: ctx.chain,
      address: underlyings[1],
      decimals: 18,
      amount: BigNumber.from(underlyingsBalanceInStablePool[1]),
    }

    underlyiedPoolsBalances.push({
      ...masterchefPoolBalances,
      amount: masterchefPoolBalances.amount,
      underlyings: [underlying0, underlying1],
      rewards: masterchefPoolBalances.rewards as Balance[],
      category: 'farm',
    })
  }

  return underlyiedPoolsBalances
}

export async function getPancakeMasterChefPoolsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  factory: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
) {
  const poolsBalances: MasterchefPoolsBalancesParams[] = []
  const variablesPoolsBalances: MasterchefPoolsBalancesParams[] = []
  const stablePoolsBalances: MasterchefPoolsBalancesParams[] = []
  const masterchefPoolsBalances: Balance[] = []
  const masterchefPools: Contract[] = await getMasterChefLpToken(ctx, pairs, masterchef, factory)

  const pendingReward = JSON.parse(
    JSON.stringify(abi.pendingReward).replace(
      'pendingSushi',

      !rewardTokenName
        ? `pending${rewardToken.symbol.charAt(0) + rewardToken.symbol.slice(1).toLowerCase()}`
        : `pending${rewardTokenName}`,
    ),
  )

  const calls: Call[] = []
  for (let poolIdx = 0; poolIdx < masterchefPools.length; poolIdx++) {
    calls.push({ target: masterchef.address, params: [masterchefPools[poolIdx].pid, ctx.address] })
  }

  const [poolsBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: pendingReward }),
  ])

  for (let userIdx = 0; userIdx < poolsBalancesRes.length; userIdx++) {
    const masterchefPool = masterchefPools[userIdx]
    const poolBalanceRes = poolsBalancesRes[userIdx]
    const pendingRewardRes = pendingRewardsRes[userIdx]

    if (!isSuccess(poolBalanceRes) || !isSuccess(pendingRewardRes)) {
      continue
    }

    poolsBalances.push({
      ...masterchefPool,
      lpToken: masterchefPool.lpToken,
      underlyings: masterchefPool.underlyings as Contract[],
      stablePool: masterchefPool.stablePool,
      category: 'farm',
      amount: BigNumber.from(poolBalanceRes.output.amount),
      rewards: [{ ...rewardToken, amount: BigNumber.from(pendingRewardRes.output) }],
    })
  }

  for (const poolsBalance of poolsBalances) {
    if (poolsBalance.stablePool) {
      stablePoolsBalances.push(poolsBalance)
    } else {
      variablesPoolsBalances.push(poolsBalance)
    }
  }

  const [underlyingsPoolsBalances, underlyingsStablePoolsBalances] = await Promise.all([
    getUnderlyingBalances(ctx, variablesPoolsBalances || []),
    getPancakeUnderlyingsMasterChefPoolsBalances(ctx, stablePoolsBalances || [], pancakeStableSwapInfos),
  ])

  masterchefPoolsBalances.push(...underlyingsPoolsBalances, ...underlyingsStablePoolsBalances)

  return masterchefPoolsBalances
}
