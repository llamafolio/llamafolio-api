import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  extraEarned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
} as const

type AuraBalance = Balance & {
  rewarders: `0x${string}`[]
}

export const getExtraRewardsBalances = async (ctx: BalancesContext, poolBalance: AuraBalance[]): Promise<Balance[]> => {
  const balanceWithStandardRewards: Balance[] = poolBalance.filter((poolBalance) => {
    return !poolBalance.rewards || poolBalance.rewarders.length === 0
  })

  const balanceWithExtraRewards: Balance[] = poolBalance.filter((poolBalance) => {
    return poolBalance.rewards && poolBalance.rewarders.length > 0 && poolBalance.amount > 0n
  })

  const extraRewardsBalancesRes = await multicall({
    ctx,
    calls: balanceWithExtraRewards
      .map((pool: Contract) =>
        pool.rewarders.map((rewarder: `0x${string}`) => ({ target: rewarder, params: [ctx.address] }) as const),
      )
      .flat(),
    abi: abi.earned,
  })

  balanceWithExtraRewards.forEach((pool) => {
    const rewards = pool.rewards as Contract[]
    const extraRewards = rewards.slice(1)

    const extraRewardsBalances = mapSuccessFilter(extraRewardsBalancesRes, (res, index) => {
      return { ...extraRewards[index], amount: res.output }
    })

    pool.rewards = [pool.rewards![0], ...extraRewardsBalances]
  })

  return [...balanceWithExtraRewards, ...balanceWithStandardRewards]
}
