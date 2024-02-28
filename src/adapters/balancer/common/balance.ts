import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { getBalancesOf } from '@lib/erc20'

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
