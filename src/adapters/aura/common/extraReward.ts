import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  extraEarned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const getExtraRewardsBalances = async (ctx: BalancesContext, poolBalance: Balance[]): Promise<Balance[]> => {
  const balanceWithStandardRewards: Balance[] = []
  const balanceWithExtraRewards: Balance[] = []

  poolBalance.forEach((poolBalance) => {
    if (!poolBalance.rewards) {
      balanceWithStandardRewards.push(poolBalance)
    } else if (poolBalance.rewards.length === 0) {
      balanceWithStandardRewards.push(poolBalance)
    } else {
      balanceWithExtraRewards.push(poolBalance)
    }
  })

  const extraRewardsBalancesRes = await multicall({
    ctx,
    calls: balanceWithExtraRewards.map((pool: Contract) => ({ target: pool.rewarder, params: [ctx.address] }) as const),
    abi: abi.extraEarned,
  })

  balanceWithExtraRewards.forEach((pool, idx) => {
    const extraRewardsBalances = extraRewardsBalancesRes[idx].success ? extraRewardsBalancesRes[idx].output : 0n
    pool.rewards = [pool.rewards![0], { ...pool.rewards![1], amount: extraRewardsBalances! }]
  })

  return [...balanceWithExtraRewards, ...balanceWithStandardRewards]
}
