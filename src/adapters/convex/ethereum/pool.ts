import { getPoolsBalances as getCurvePoolsBalances, getPoolsFromLpTokens } from '@adapters/curve/common/meta-registry'
import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { keyBy, range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi, resolveERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

import { getCvxCliffRatio } from './utils'

interface BaseRewardPoolContract extends Contract {
  token: string
  lpToken: string
  crvRewards: string
}

interface PoolContract extends BaseRewardPoolContract {
  pool: string
}

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
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
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
  extraRewardsLength: {
    inputs: [],
    name: 'extraRewardsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPoolsContracts(ctx: BaseContext, contract: Contract) {
  const pools: PoolContract[] = []

  const getPoolsCount = await call({
    ctx,
    target: contract.address,
    params: [],
    abi: abi.poolLength,
  })

  const getPoolInfos = await multicall({
    ctx,
    calls: range(0, getPoolsCount.output).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: abi.poolInfo,
  })

  const poolInfos = getPoolInfos
    .filter((res) => res.success)
    .map((res) => res.output)
    .filter((res) => res.lptoken !== '0xB15fFb543211b558D40160811e5DcBcd7d5aaac9') // dead address

  const baseRewardPools: BaseRewardPoolContract[] = poolInfos.map((poolInfo) => ({
    chain: ctx.chain,
    address: poolInfo.crvRewards,
    token: poolInfo.token,
    lpToken: poolInfo.lptoken,
    crvRewards: poolInfo.crvRewards,
  }))

  // - underlyings from Curve Meta registry contract
  // - rewards from Convex BaseRewardPool contracts
  const [{ baseRewardPoolsTokens }, curvePools, baseRewardPoolsWithRewards] = await Promise.all([
    resolveERC20Details(ctx, { baseRewardPoolsTokens: baseRewardPools.map((pool) => pool.token) }),
    getPoolsFromLpTokens(
      ctx,
      baseRewardPools.map((token) => token.lpToken),
    ),
    getBaseRewardPoolsRewards(ctx, baseRewardPools),
  ])
  const curvePoolByLpToken = keyBy(curvePools, 'lpToken', { lowercase: true })

  for (let poolIdx = 0; poolIdx < baseRewardPools.length; poolIdx++) {
    const baseRewardPool = baseRewardPoolsWithRewards[poolIdx]
    const tokenRes = baseRewardPoolsTokens[poolIdx]
    const curvePool = curvePoolByLpToken[baseRewardPool.lpToken.toLowerCase()]
    if (!isSuccess(tokenRes) || !curvePool) {
      continue
    }

    const pool: PoolContract = {
      ...baseRewardPool,
      decimals: tokenRes.output.decimals,
      symbol: tokenRes.output.symbol,
      pool: curvePool.address,
      underlyings: curvePool.underlyings,
    }

    pools.push(pool)
  }

  return pools
}

export async function getBaseRewardPoolsRewards(ctx: BaseContext, baseRewardPools: BaseRewardPoolContract[]) {
  const res: BaseRewardPoolContract[] = []

  const extraRewardsLengthsRes = await multicall({
    ctx,
    calls: baseRewardPools.map((baseRewardPool) => ({
      target: baseRewardPool.crvRewards,
      params: [],
    })),
    abi: abi.extraRewardsLength,
  })

  const extraRewardsRes = await multicall<string, [number], string>({
    ctx,
    calls: extraRewardsLengthsRes.filter(isSuccess).flatMap((res) =>
      range(0, res.output).map((idx) => ({
        target: res.input.target,
        params: [idx],
      })),
    ),
    abi: abi.extraRewards,
  })

  let extraRewardCallIdx = 0
  for (let poolIdx = 0; poolIdx < extraRewardsLengthsRes.length; poolIdx++) {
    const extraRewardsLengthRes = extraRewardsLengthsRes[poolIdx]
    if (!isSuccess(extraRewardsLengthRes)) {
      continue
    }

    const baseRewardPool = { ...baseRewardPools[poolIdx], rewards: [] as string[] }

    for (let extraRewardIdx = 0; extraRewardIdx < extraRewardsLengthRes.output; extraRewardIdx++) {
      const extraRewardRes = extraRewardsRes[extraRewardCallIdx]
      if (isSuccess(extraRewardRes)) {
        baseRewardPool.rewards.push(extraRewardRes.output)
      }

      extraRewardCallIdx++
    }

    res.push(baseRewardPool)
  }

  return res
}

export async function getPoolsBalances(ctx: BalancesContext, pools: PoolContract[], CVX: Token, CRV: Token) {
  const balances = await getCurvePoolsBalances(ctx, pools, {
    getBalanceAddress: (pool) => pool.crvRewards,
    getLpTokenAddress: (pool) => pool.lpToken,
    getPoolAddress: (pool) => pool.pool,
  })

  const [crvEarnedRes, extraRewardsEarnedRes, cvxTotalSupplyRes] = await Promise.all([
    multicall({
      ctx,
      calls: balances.map((balance) => ({
        // @ts-ignore
        target: balance.crvRewards,
        params: [ctx.address],
      })),
      abi: abi.earned,
    }),

    multicall({
      ctx,
      calls: balances.flatMap((balance) =>
        (balance.rewards || []).map((reward) => ({
          target: reward.address,
          params: [ctx.address],
        })),
      ),
      abi: abi.earned,
    }),

    call({
      ctx,
      target: CVX.address,
      abi: erc20Abi.totalSupply,
      params: [],
    }),
  ])

  let extraRewardsEarnedIdx = 0
  for (let balanceIdx = 0; balanceIdx < balances.length; balanceIdx++) {
    const balance = balances[balanceIdx]
    balance.category = 'stake'

    const crvEarned = BigNumber.from(crvEarnedRes[balanceIdx].output || '0')
    const cvxTotalSupply = BigNumber.from(cvxTotalSupplyRes.output || '0')

    const rewards: Balance[] = []

    if (crvEarned.gt(0)) {
      const cvxEarned = getCvxCliffRatio(cvxTotalSupply, crvEarned)
      rewards.push({ ...CRV, amount: crvEarned }, { ...CVX, amount: cvxEarned })
    }

    if (balance.rewards) {
      for (let extraRewardIdx = 0; extraRewardIdx < balance.rewards.length; extraRewardIdx++) {
        const extraRewardEarnedRes = extraRewardsEarnedRes[extraRewardsEarnedIdx]

        rewards.push({
          ...balance.rewards?.[extraRewardIdx],
          amount: BigNumber.from(extraRewardEarnedRes.output || '0'),
        })

        extraRewardsEarnedIdx++
      }
    }

    balance.rewards = rewards
  }

  return balances
}
