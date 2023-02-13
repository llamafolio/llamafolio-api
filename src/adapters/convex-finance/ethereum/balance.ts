import { getPoolsBalances } from '@adapters/curve/common/balance'
import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
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
}

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

export async function getConvexGaugesBalances(ctx: BalancesContext, pools: Contract[], registry: Contract) {
  const gauges: Contract[] = []
  const gaugesBalances: Balance[] = []
  // const commonRewards: Balance[] = []

  for (const pool of pools) {
    gauges.push({ ...pool, address: pool.crvRewards })
  }

  const gaugesBalancesRes = await getPoolsBalances(ctx, gauges, registry, true)

  const calls: Call[] = []
  for (const gaugeBalance of gaugesBalancesRes) {
    gaugeBalance.category = 'farm'
    calls.push({ target: (gaugeBalance as Contract).crvRewards, params: [ctx.address] })
  }

  const [claimableRewards, cvxTotalSupplyRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.earned }),
    call({ ctx, target: CVX.address, abi: erc20Abi.totalSupply }),
  ])

  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    const gaugeBalance = gaugesBalancesRes[gaugeIdx]
    const rewards = gaugeBalance.rewards as Contract[]
    const claimableReward = claimableRewards[gaugeIdx]

    if (!rewards || !isSuccess(claimableReward)) {
      continue
    }

    // rewards[0] is the common rewards for all pools: CRV
    rewards[0].amount = BigNumber.from(claimableReward.output)

    if (rewards[0].amount.gt(0)) {
      const cvxEarned = getCvxCliffRatio(BigNumber.from(cvxTotalSupplyRes.output), rewards[0].amount)
      // rewards[1] is the common rewards for all pools: CVX
      rewards[1].amount = cvxEarned
      gaugesBalances.push(gaugeBalance)
    }
  }

  return gaugesBalances
}
