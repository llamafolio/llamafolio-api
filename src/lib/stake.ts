import { Balance, BalancesContext, Contract } from '@lib/adapter'

export async function getSingleStakeBalance(_ctx: BalancesContext, contract: Contract) {
  const balance: Balance = {
    ...(contract as Balance),
    category: 'stake',
  }

  return balance
}
