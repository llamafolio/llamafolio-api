import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import { getPricesPerSharesBalances } from '@lib/pricePerShare'

export async function getOpiumBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances = await getBalancesOf(ctx, pools, { getAddress: (contract) => contract.address })
  return getPricesPerSharesBalances(ctx, balances, { getCategory: () => 'stake' })
}
