import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy, mapSuccess } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { getBalancesOf } from '@lib/erc20'
import { type Call, multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  claimable_tokens: {
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'claimable_tokens',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  claimable_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_reward_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

export async function getAllBalancerBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  const { lp, farm } = groupBy(await getBalancerBalances(ctx, pools, vault), 'category')
  return [...lp, ...(await getBalancerRewards(ctx, farm))]
}

export async function getBalancerBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  const [lpBalances, farmBalances]: Balance[][] = await Promise.all([
    (await getBalancesOf(ctx, pools, { getAddress: (contract) => contract.address })).map((poolBalance) => ({
      ...poolBalance,
      category: 'lp',
    })),
    (
      await getBalancesOf(
        ctx,
        pools.filter((pool) => pool.gauge),
        { getAddress: (contract) => contract.gauge },
      )
    ).map((poolBalance) => ({
      ...poolBalance,
      category: 'farm',
    })),
  ])

  return getUnderlyingsBalancesFromBalancer(ctx, [...lpBalances, ...farmBalances] as IBalancerBalance[], vault, {
    getAddress: (balance: Balance) => balance.address,
    getCategory: (balance: Balance) => balance.category,
  })
}

async function getBalancerRewards(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const rewardCalls: Call<typeof abi.claimable_reward>[] = (pools || []).flatMap(
    (pool, poolIndex) =>
      pool.rewards?.map(
        (rewardToken, rewardTokenIndex) =>
          ({
            target: pool.gauge,
            params: [ctx.address, (rewardToken as Contract).address],
            meta: { poolIndex, rewardTokenIndex },
          }) as any,
      ),
  )

  const [pendingBals, extraRewardsBalances] = await Promise.all([
    multicall({
      ctx,
      calls: (pools || []).map((pool) => ({ target: pool.gauge, params: [ctx.address] }) as const),
      abi: abi.claimable_tokens,
    }),
    multicall({
      ctx,
      calls: rewardCalls,
      abi: abi.claimable_reward,
    }),
  ])

  const rewardsByPool = extraRewardsBalances.reduce((acc: any, result) => {
    const { meta } = result.input as any
    const { poolIndex, rewardTokenIndex } = meta

    if (!acc[poolIndex]) {
      acc[poolIndex] = { ...pools[poolIndex], rewards: [...(pools[poolIndex].rewards as Contract[])] }
    }

    acc[poolIndex].rewards[rewardTokenIndex] = {
      ...acc[poolIndex].rewards[rewardTokenIndex],
      amount: result.output,
    }

    return acc
  }, {})

  return mapSuccess(pendingBals, (res, index) => {
    const pool = Object.values(rewardsByPool)[index] as Contract
    if (!pool || !pool.rewards) return null

    const rewards = pool.rewards as Contract[]

    if (rewards.length > 0 && rewards[0].amount === 0n) {
      rewards[0] = { ...rewards[0], amount: res.output }
    }

    return { ...pool, rewards }
  }).filter(isNotNullish)
}
