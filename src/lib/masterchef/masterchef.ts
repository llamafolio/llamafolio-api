import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isNotNullish, isSuccess } from '@lib/type'
import { Pair } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
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
}

const getMasterChefPoolsInfos = async (ctx: BaseContext, pairs: Pair[], masterchef: Contract): Promise<Contract[]> => {
  const pools: Contract[] = []

  const poolLengthRes = await call({ ctx, target: masterchef.address, params: [], abi: abi.poolLength })

  const poolLength = parseInt(poolLengthRes.output)

  const calls: Call[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: masterchef.address, params: [idx] })
  }

  const poolInfosRes = await multicall({ ctx, calls, abi: abi.poolInfo })

  for (let poolIdx = 0; poolIdx < poolInfosRes.length; poolIdx++) {
    const poolInfoRes = poolInfosRes[poolIdx]
    if (!isSuccess(poolInfoRes)) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: poolInfoRes.output.lpToken,
      lpToken: poolInfoRes.output.lpToken,
      pid: poolInfoRes.input.params[0],
    })
  }

  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pairs) {
    pairByAddress[pair.address.toLowerCase()] = pair
  }

  const masterchefPools = pools
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]

      if (!pair) {
        return null
      }

      const contract: Contract = { ...pair, pid: pool.pid, category: 'farm' }
      return contract
    })
    .filter(isNotNullish)

  return masterchefPools
}

const getMasterChefLpToken = async (ctx: BaseContext, pairs: Pair[], masterchef: Contract): Promise<Contract[]> => {
  const pools: Contract[] = []

  const poolLengthRes = await call({ ctx, target: masterchef.address, params: [], abi: abi.poolLength })

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

  const masterchefPools = pools
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]

      if (!pair) {
        return null
      }

      const contract: Contract = { ...pair, pid: pool.pid, category: 'farm' }
      return contract
    })
    .filter(isNotNullish)

  return masterchefPools
}

/**
 * @param rewardTokenName `string` used to replace pending rewards function on abi
 * @param lpTokenAbi `True` if using masterchef_v2 since it uses LpToken `function` instead of `poolsInfo`
 */

export async function getMasterChefPoolsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
) {
  const poolsBalances: Balance[] = []
  const masterchefPools: Contract[] = []

  if (!lpTokenAbi) {
    masterchefPools.push(...(await getMasterChefPoolsInfos(ctx, pairs, masterchef)))
  } else {
    masterchefPools.push(...(await getMasterChefLpToken(ctx, pairs, masterchef)))
  }

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
      underlyings: masterchefPool.underlyings as Contract[],
      category: 'farm',
      amount: BigNumber.from(poolBalanceRes.output.amount),
      rewards: [{ ...rewardToken, amount: BigNumber.from(pendingRewardRes.output) }],
    })
  }

  return getUnderlyingBalances(ctx, poolsBalances)
}
