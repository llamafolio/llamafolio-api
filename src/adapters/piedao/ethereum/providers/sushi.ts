import type { Balance, BalancesContext } from '@lib/adapter'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

export const sushiProvider = async (ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> => {
  return getUnderlyingBalances(ctx, pools)
}
