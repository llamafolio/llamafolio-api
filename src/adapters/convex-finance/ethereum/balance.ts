import { getPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

import { getCvxCliffRatio } from './utils'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
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
} as const

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

export async function getConvexGaugesBalances(
  ctx: BalancesContext,
  pools: Contract[],
  registry: Contract,
): Promise<Balance[]> {
  const commonRewardsPools: Balance[] = []
  const extraRewardsPools: Balance[] = []

  pools = pools.map((pool) => ({ ...pool, address: pool.crvRewards }))

  const gaugesBalancesRes = await getPoolsBalances(ctx, pools, registry, true)

  const calls: Call[] = []
  for (const gaugeBalance of gaugesBalancesRes) {
    gaugeBalance.category = 'stake'
    calls.push({ target: (gaugeBalance as Contract).crvRewards, params: [ctx.address] })
  }

  const [claimableRewards, cvxTotalSupply] = await Promise.all([
    multicall({ ctx, calls, abi: abi.earned }),
    call({ ctx, target: CVX.address, abi: erc20Abi.totalSupply }),
  ])

  const extraRewardsCalls: Call[] = []
  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    const gaugeBalance = gaugesBalancesRes[gaugeIdx]
    const claimableReward = claimableRewards[gaugeIdx]
    const rewards = gaugeBalance.rewards as Contract[]

    if (!rewards || !isSuccess(claimableReward)) continue

    // rewards[0] is the common reward for all pools: CRV
    rewards[0].amount = BigNumber.from(claimableReward.output || BN_ZERO)

    // rewards[1] is the common reward for all pools: CVX
    rewards[1].amount = getCvxCliffRatio(BigNumber.from(cvxTotalSupply), rewards[0].amount)

    if (rewards.length < 3) {
      commonRewardsPools.push(gaugeBalance)
      continue
    }

    extraRewardsPools.push(gaugeBalance)

    for (let rewardIdx = 0; rewardIdx < gaugeBalance.rewards!.length - 2; rewardIdx++) {
      const rewarder = (gaugeBalance as Contract).rewarder[rewardIdx]
      extraRewardsCalls.push({ target: rewarder, params: [ctx.address] })
    }
  }

  const extraRewardsRes = await multicall({ ctx, calls: extraRewardsCalls, abi: abi.earned })

  let extraRewardsCallIdx = 0
  for (let poolIdx = 0; poolIdx < extraRewardsPools.length; poolIdx++) {
    const extraRewardsPool = extraRewardsPools[poolIdx]
    const rewards = extraRewardsPool.rewards as Contract[]
    if (!rewards) continue

    for (let extraRewardIdx = 2; extraRewardIdx < rewards.length; extraRewardIdx++) {
      const reward = rewards[extraRewardIdx]
      const extraRewardRes = extraRewardsRes[extraRewardsCallIdx]

      if (!isSuccess(extraRewardRes)) continue

      reward.amount = BigNumber.from(extraRewardRes.output)

      extraRewardsCallIdx++
    }

    // CVX can sometimes appears as common and extra rewards
    if (rewards[1].address === rewards[2].address) {
      rewards[1].amount = rewards[1].amount.add(rewards[2].amount)
      rewards.splice(2, 1)
    }
  }

  return [...commonRewardsPools, ...extraRewardsPools]
}
