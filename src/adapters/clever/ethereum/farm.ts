import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { getBalancesOf } from '@lib/erc20'

export async function getCleFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances = await getBalancesOf(ctx, farmers, { getAddress: (c) => c.address })
  return (await getCurveUnderlyingsBalances(ctx, balances)).map((res: any) => ({ ...res, category: 'farm' }))
}
