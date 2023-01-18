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

export interface PoolBalance extends Balance {
  pool?: string
  lpToken?: string
  totalSupply?: BigNumber
}

export async function getPoolBalances(ctx: BalancesContext, pools: Contract[], registry: Contract) {
  const poolBalances: PoolBalance[] = []

  const poolBalanceCalls = pools.map((pool) => ({
    target: pool.gauge,
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
  const gaugesBaseBalances: Balance[] = []
  const calls: Call[] = []

  const gaugesBalancesRes = await getPoolBalances(ctx, gauges, registry)

  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    calls.push({ target: gaugesBalancesRes[gaugeIdx].address, params: [ctx.address] })
  }

  const claimableRewards = await multicall({ ctx, calls, abi: abi.claimable_reward })

  // for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
  for (let gaugeIdx = 0; gaugeIdx < 30; gaugeIdx++) {
    const rewards = gaugesBalancesRes[gaugeIdx].rewards || []
    const gaugeRewards = []

    for (let rewardIdx = 0; rewardIdx < rewards.length; rewardIdx++) {
      const gaugeRewardsRes = claimableRewards[gaugeIdx]
      if (!isSuccess(gaugeRewardsRes)) {
        continue
      }

      gaugeRewards.push({
        ...gaugesBalancesRes[gaugeIdx].rewards![rewardIdx],
        amount: BigNumber.from(claimableRewards[gaugeIdx].output),
      })
    }

    gaugesBaseBalances.push({ ...gaugesBalancesRes[gaugeIdx], rewards: gaugeRewards })
  }

  /**
   *
   *     [WIP]
   *
   */

  // for (const gaugesBaseBalance of gaugesBaseBalances) {
  //   const rewards = gaugesBaseBalance.rewards
  //   if (!rewards) {
  //     continue
  //   }
  //   if (rewards.length > 1) {
  //     gaugeWithExtraRewardsBalances.push(gaugesBaseBalance)
  //   }
  // }

  // const extraRewardsGaugesBalances = await getExtraRewards(ctx, gaugeWithExtraRewardsBalances)

  for (const gaugesBaseBalance of gaugesBaseBalances) {
    gaugesBaseBalance.category = 'stake'
  }

  return gaugesBaseBalances
}

/**
 *
 *    [WIP]
 *
 */

// const getExtraRewards = async (ctx: BalancesContext, pools: Contract[]) => {
//   const gaugeWithoutExtraRewardsContracts: Contract[] = []
//   const gaugeWithExtraRewardsContracts: Contract[] = []

//   const extraRewardsContractsCalls: Call[] = []
//   for (const pool of pools) {
//     extraRewardsContractsCalls.push({ target: pool.address, params: [] })
//   }

//   const extraRewardsContractsRes = await multicall({ ctx, calls: extraRewardsContractsCalls, abi: abi.reward_contract })

//   let extraRewardsContractIdx = 0
//   for (let gaugeIdx = 0; gaugeIdx < pools.length; gaugeIdx++) {
//     const pool = pools[gaugeIdx]
//     const extraRewardsContractRes = extraRewardsContractsRes[extraRewardsContractIdx]

//     if (!isSuccess(extraRewardsContractRes)) {
//       gaugeWithoutExtraRewardsContracts.push(pool)
//       continue
//     }

//     pool.rewardContract = extraRewardsContractRes.output

//     gaugeWithExtraRewardsContracts.push(pool)
//     extraRewardsContractIdx++
//   }

//   const extraRewardsBalancesCalls: Call[] = []
//   for (const gaugeWithExtraRewardsContract of gaugeWithExtraRewardsContracts) {
//     extraRewardsBalancesCalls.push({
//       target: gaugeWithExtraRewardsContract.rewardContract,
//       params: [gaugeWithExtraRewardsContract.address],
//     })
//   }

//   const extraRewardsBalancesRes = await multicall({ ctx, calls: extraRewardsBalancesCalls, abi: abi.earned })

//   for (let gaugeIdx = 0; gaugeIdx < gaugeWithExtraRewardsContracts.length; gaugeIdx++) {
//     const rewards = gaugeWithExtraRewardsContracts[gaugeIdx].rewards![1]
//     if (!rewards) {
//       continue
//     }

//     const extraRewardsBalanceRes = extraRewardsBalancesRes[gaugeIdx]
//     if (!isSuccess(extraRewardsBalanceRes)) {
//       continue
//     }

//     ;(rewards as Balance).amount = BigNumber.from(extraRewardsBalanceRes.output)
//   }

//   return [...gaugeWithExtraRewardsContracts, ...gaugeWithoutExtraRewardsContracts]
// }
