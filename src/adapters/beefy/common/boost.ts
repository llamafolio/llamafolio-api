import { getBeefyUnderlyingsBalances } from '@adapters/beefy/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  earned: {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

type BeefyBalances = Balance & {
  beefyKey: string
}

export async function getBoostBeefyBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: BeefyBalances[] = []
  const boostPools = pools.filter((pool) => pool.boostStatus === 'active')

  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: boostPools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: boostPools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  for (const [index, pool] of boostPools.entries()) {
    const reward = pool.rewards?.[0] as Contract
    const userBalanceRes = userBalancesRes[index]
    const userPendingRewardRes = userPendingRewardsRes[index]

    if (!userBalanceRes.success || !userPendingRewardRes.success || userBalanceRes.output === 0n) {
      continue
    }

    balances.push({
      ...pool,
      amount: userBalanceRes.output,
      underlyings: pool.underlyings as Contract[],
      rewards: [{ ...reward, amount: userPendingRewardRes.output }],
      beefyKey: pool.beefyKey,
      category: 'farm',
    })
  }

  return getBeefyUnderlyingsBalances(ctx, balances)
}
