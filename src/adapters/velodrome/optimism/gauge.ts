import { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getStakingPoolsBalances } from '@lib/pools'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

import { GaugeContract } from './pair'

const abi = {
  last_gauge: {
    inputs: [],
    name: 'last_gauge',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getGaugeContract(ctx: BaseContext, gaugeFactory: Contract) {
  const { output: address } = await call({ ctx, target: gaugeFactory.address, abi: abi.last_gauge })
  const contract: Contract = { chain: ctx.chain, address }

  return contract
}

export async function getGaugesBalances(ctx: BalancesContext, gauges: GaugeContract[]) {
  const stakingBalances = await getStakingPoolsBalances(ctx, gauges, {
    getPoolAddress: (gauge) => (gauge as GaugeContract).token,
    getLPTokenAddress: (gauge) => (gauge as GaugeContract).token,
  })

  const rewardsRes = await multicall({
    ctx,
    calls: stakingBalances.flatMap(
      (balance) =>
        balance.rewards?.map((reward) => ({ target: balance.address, params: [reward.address, ctx.address] })) ?? [],
    ),
    abi: abi.earned,
  })

  let rewardIdx = 0
  for (let balanceIdx = 0; balanceIdx < stakingBalances.length; balanceIdx++) {
    const rewards = stakingBalances[balanceIdx].rewards
    if (!rewards) {
      continue
    }

    for (const reward of rewards) {
      const rewardRes = rewardsRes[rewardIdx]

      if (isSuccess(rewardRes)) {
        reward.amount = BigNumber.from(rewardRes.output)
      }

      rewardIdx++
    }
  }

  return stakingBalances
}
