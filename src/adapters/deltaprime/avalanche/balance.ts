import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getSingleStakeBalances } from '@lib/stake'

export async function getDeltaFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  return (await getSingleStakeBalances(ctx, pools)).map((balance) => ({
    ...balance,
    decimals: balance.underlyings?.[0].decimals,
  }))
}
