import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getSingleStakeBalance } from '@lib/stake'

export async function getTProtocolBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balances = await getSingleStakeBalance(ctx, contract)

  console.log(balances)
}
