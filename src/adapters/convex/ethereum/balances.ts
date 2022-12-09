import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'
import { getUnderlyingsBalancesInPool } from '@lib/underlyings'

import { getCRVCVXRewards } from './rewards'

export async function getPoolsBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const balances: Balance[] = []
  const nonZeroPools: Contract[] = (await getERC20BalanceOf(ctx, chain, contracts as Token[])).filter((pool) =>
    pool.amount.gt(0),
  )

  for (const nonZeroPool of nonZeroPools) {
    const underlyiedPoolBalances = await getUnderlyingsBalancesInPool(
      chain,
      nonZeroPool,
      nonZeroPool.lpToken,
      nonZeroPool.poolAddress,
    )

    const rewardsBalances = (nonZeroPool.rewards = await getCRVCVXRewards(ctx, chain, nonZeroPool))

    balances.push({
      chain,
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
