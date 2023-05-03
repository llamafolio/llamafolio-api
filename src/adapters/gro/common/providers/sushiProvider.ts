import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

export async function getSushiProvider(ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> {
  return getPairsDetails(ctx, contracts)
}

export async function getSushiProviderBalances(ctx: BalancesContext, contracts: Balance[]): Promise<Balance[]> {
  return getUnderlyingBalances(ctx, contracts)
}
