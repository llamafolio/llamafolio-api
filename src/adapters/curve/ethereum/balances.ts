import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_underlying_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
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
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'claimable_tokens',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3038676,
  },
  claimable_extra_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_reward_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 20255,
  },
  reward_contract: {
    name: 'reward_contract',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 2411,
  },
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getLpCurveBalances(
  ctx: BalancesContext,
  pools: Contract[],
  metaRegistry: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const lpBalances = await getPoolBalances(ctx, pools, metaRegistry)

  for (const lpBalance of lpBalances) {
    const underlyings = lpBalance.underlyings as Contract[]

    if (!underlyings) {
      continue
    }

    //  Tokemak reactor's underlyings act as duplicate with abnormal balances because tTokens are not known.
    //  The following if...else fix it by using common underlyings for each Tokemak lpTokens as `Debank` does

    if (underlyings[0].symbol !== `t${underlyings[1].symbol}`) {
      balances.push(lpBalance)
    } else {
      balances.push({
        ...lpBalance,
        underlyings: [{ ...underlyings[1], amount: underlyings[1].amount.add(underlyings[0].amount) }],
      })
    }
  }

  return balances
}

interface PoolBalance extends Balance {
  pool?: string
  lpToken?: string
  totalSupply?: BigNumber
}

const getPoolBalances = async (ctx: BalancesContext, pools: Contract[], registry: Contract): Promise<Balance[]> => {
  const poolBalances: Balance[] = []

  const poolBalanceCalls = pools.map((pool) => ({
    target: pool.address,
    params: ctx.address,
  }))

  const poolsBalancesOfRes = await multicall({ ctx, calls: poolBalanceCalls, abi: erc20Abi.balanceOf })

  let poolIdx = 0
  for (let balanceIdx = 0; balanceIdx < pools.length; balanceIdx++) {
    const pool = pools[poolIdx]
    const poolBalanceOfRes = poolsBalancesOfRes[balanceIdx]

    if (!isSuccess(poolBalanceOfRes)) {
      poolIdx++
      continue
    }

    poolBalances.push({
      ...pool,
      amount: BigNumber.from(poolBalanceOfRes.output),
      underlyings: (pool as Balance).underlyings,
      rewards: (pool as Balance).rewards,
    })

    poolIdx++
  }

  // There is no need to look for underlyings balances if pool balances is null
  const nonZeroPoolBalances = poolBalances.filter((res) => res.amount.gt(0))

  return getUnderlyingsPoolsBalances(ctx, nonZeroPoolBalances, registry)
}

const getUnderlyingsPoolsBalances = async (ctx: BalancesContext, pools: PoolBalance[], registry: Contract) => {
  const underlyingsBalancesInPools: Balance[] = []

  const calls: Call[] = []

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    calls.push({
      target: registry.address,
      params: [(pools[poolIdx] as Contract).pool],
    })
  }

  const [totalSuppliesRes, underlyingsBalanceOfRes, underlyingsDecimalsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((token) => ({
        params: [],
        target: token.lpToken,
      })),
      abi: erc20Abi.totalSupply,
    }),

    multicall({ ctx, calls, abi: abi.get_underlying_balances }),
    multicall({ ctx, calls, abi: abi.get_underlying_decimals }),
  ])

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
      // next pool
      balanceOfIdx += underlyings.length
      continue
    }

    const totalSupply = BigNumber.from(totalSupplyRes.output)

    const poolBalance: PoolBalance = {
      ...pools[poolIdx],
      category: 'lp',
      underlyings: [],
      decimals: 18,
      totalSupply,
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceOfRes = underlyingsBalanceOfRes[balanceOfIdx]
      const underlyingDecimalsRes = underlyingsDecimalsRes[balanceOfIdx]

      const underlyingsBalance =
        isSuccess(underlyingBalanceOfRes) && underlyingBalanceOfRes.output[underlyingIdx] != undefined
          ? BigNumber.from(underlyingBalanceOfRes.output[underlyingIdx])
          : BN_ZERO

      const underlyingsDecimals =
        isSuccess(underlyingDecimalsRes) && underlyingDecimalsRes.output[underlyingIdx] != undefined
          ? underlyingDecimalsRes.output[underlyingIdx]
          : 18

      poolBalance.underlyings?.push({
        ...underlyings[underlyingIdx],
        decimals: underlyingsDecimals,
        amount: underlyingsBalance.mul(poolBalance.amount).div(poolBalance.totalSupply!),
      })
    }

    underlyingsBalancesInPools.push(poolBalance)
    balanceOfIdx++
  }

  return underlyingsBalancesInPools
}

export async function getGaugesBalances(ctx: BalancesContext, gauges: Contract[], registry: Contract) {
  const uniqueRewards: Balance[] = []
  const nonUniqueRewards: Balance[] = []

  const gaugesBalancesRes = await getPoolBalances(ctx, gauges, registry)

  const calls: Call[] = []
  for (const gaugesBalance of gaugesBalancesRes) {
    gaugesBalance.category = 'farm'
    calls.push({ target: gaugesBalance.address, params: [ctx.address] })
  }

  const claimableRewards = await multicall({ ctx, calls, abi: abi.claimable_reward })

  const extraRewardsCalls: Call[] = []
  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    const gaugeBalance = gaugesBalancesRes[gaugeIdx]
    const rewards = gaugeBalance.rewards as Contract[]
    const claimableReward = claimableRewards[gaugeIdx]

    if (!rewards || !isSuccess(claimableReward)) {
      continue
    }

    // rewards[0] is the common rewards for all pools: CRV
    rewards[0].amount = BigNumber.from(claimableReward.output)

    if (rewards.length != 2) {
      uniqueRewards.push(gaugeBalance)
      continue
    }

    for (let rewardIdx = 1; rewardIdx < rewards.length; rewardIdx++) {
      const reward = rewards[rewardIdx]
      extraRewardsCalls.push({ target: (gaugeBalance as Contract).gauge, params: [ctx.address, reward.address] })
      nonUniqueRewards.push(gaugeBalance)
    }
  }

  const extraRewardsRes = await multicall({ ctx, calls: extraRewardsCalls, abi: abi.claimable_extra_reward })

  for (let idx = 0; idx < nonUniqueRewards.length; idx++) {
    const rewards = nonUniqueRewards[idx].rewards
    const extraRewardRes = extraRewardsRes[idx]

    if (!rewards || !isSuccess(extraRewardRes)) {
      continue
    }

    rewards[1].amount = BigNumber.from(extraRewardRes.output)
  }

  return [...uniqueRewards, ...nonUniqueRewards]
}
