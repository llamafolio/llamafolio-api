import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import { resolveUnderlyingsBalances } from '@lib/underlying'

export async function getBalancesBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  const [lpBalances, farmBalances]: Balance[][] = await Promise.all([
    (await getBalancesOf(ctx, pools, { getAddress: (contract) => contract.address })).map((poolBalance) => ({
      ...poolBalance,
      category: 'lp',
    })),
    (await getBalancesOf(ctx, pools, { getAddress: (contract) => contract.gauge })).map((poolBalance) => ({
      ...poolBalance,
      category: 'farm',
    })),
  ])

  return resolveUnderlyingsBalances('balancer', {
    ctx,
    balances: [...lpBalances, ...farmBalances],
    vault,
    params: {
      getAddress: (balance: Balance) => balance.address,
      getCategory: (balance: Balance) => balance.category,
    },
  })
}
