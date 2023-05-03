import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getTotalRewardsBalance: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getTotalRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getLyraStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }))

  const [balanceOfsRes, totalRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.getTotalRewardsBalance }),
  ])

  for (let idx = 0; idx < stakers.length; idx++) {
    const staker = stakers[idx]
    const underlyings = staker.underlyings as Contract[]
    const reward = staker.rewards?.[0] as Contract
    const balanceOfRes = balanceOfsRes[idx]
    const totalRewardRes = totalRewardsRes[idx]
    const rewardAmount = isSuccess(totalRewardRes) ? BigNumber.from(totalRewardRes.output) : BN_ZERO

    if (!isSuccess(balanceOfRes)) {
      continue
    }

    balances.push({
      ...staker,
      amount: BigNumber.from(balanceOfRes.output),
      decimals: underlyings[0].decimals,
      underlyings,
      rewards: [{ ...reward, amount: rewardAmount }],
      category: 'stake',
    })
  }

  return balances
}
