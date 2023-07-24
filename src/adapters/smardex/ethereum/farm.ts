import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { keyBy, rangeBI } from '@lib/array'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  campaignInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'campaignInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'stakingToken', type: 'address' },
      { internalType: 'contract IERC20', name: 'rewardToken', type: 'address' },
      { internalType: 'uint256', name: 'startBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
      { internalType: 'uint256', name: 'totalRewards', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  campaignInfoLen: {
    inputs: [],
    name: 'campaignInfoLen',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      { internalType: 'uint256', name: '_campaignID', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
} as const

const SDEX: Token = {
  chain: 'ethereum',
  address: '0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF',
  decimals: 18,
  symbol: 'SDEX',
}

export async function getSmarDexFarmBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
): Promise<Balance[]> {
  const poolsBalances: Balance[] = []
  const masterchefPools: Contract[] = await getMasterChefPoolsInfos(ctx, pairs, masterchef)

  const calls: Call<typeof abi.userInfo>[] = masterchefPools.map((pool) => ({
    target: masterchef.address,
    params: [pool.pid, ctx.address],
  }))

  const [poolsBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let userIdx = 0; userIdx < poolsBalancesRes.length; userIdx++) {
    const masterchefPool = masterchefPools[userIdx]
    const poolBalanceRes = poolsBalancesRes[userIdx]
    const pendingRewardRes = pendingRewardsRes[userIdx]

    if (!poolBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    const [amount] = poolBalanceRes.output

    poolsBalances.push({
      ...masterchefPool,
      underlyings: masterchefPool.underlyings as Contract[],
      category: 'farm',
      amount: amount,
      rewards: [{ ...SDEX, amount: pendingRewardRes.output }],
    })
  }

  return getUnderlyingBalances(ctx, poolsBalances)
}

const getMasterChefPoolsInfos = async (ctx: BaseContext, pairs: Pair[], masterchef: Contract): Promise<Contract[]> => {
  const pairByAddress = keyBy(pairs, 'address', { lowercase: true })

  const poolLengthRes = await call({
    ctx,
    target: masterchef.address,
    abi: abi.campaignInfoLen,
  })

  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLengthRes).map((idx) => ({ target: masterchef.address, params: [idx] }) as const),
    abi: abi.campaignInfo,
  })

  const pools: Contract[] = mapSuccessFilter(poolInfosRes, (res) => {
    const [stakingToken] = res.output
    return {
      chain: ctx.chain,
      address: stakingToken,
      lpToken: stakingToken,
      pid: res.input.params[0],
    }
  })

  const masterchefPools: Contract[] = pools
    .map((pool: Contract) => {
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
