import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getUnderlyingsBalancesInPool } from '@lib/convex/underlyings'
import { getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'

import { getCRVCVXRewards } from './rewards'

export async function getPoolsBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances: Balance[] = []
  const nonZeroPools: Contract[] = (await getERC20BalanceOf(ctx, contracts as Token[])).filter((pool) =>
    pool.amount.gt(0),
  )

  for (const nonZeroPool of nonZeroPools) {
    const underlyiedPoolBalances = await getUnderlyingsBalancesInPool(
      ctx.chain,
      nonZeroPool,
      nonZeroPool.lpToken,
      nonZeroPool.poolAddress,
    )

    const rewardsBalances = (nonZeroPool.rewards = await getCRVCVXRewards(ctx, nonZeroPool))

    balances.push({
      chain: ctx.chain,
      address: nonZeroPool.address,
      symbol: underlyiedPoolBalances.map((underlying) => underlying.symbol).join('-'),
      decimals: nonZeroPool.decimals,
      amount: nonZeroPool.amount,
      underlyings: underlyiedPoolBalances,
      rewards: rewardsBalances,
      category: 'stake',
    })
  }
  return balances
}
