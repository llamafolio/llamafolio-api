import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getERC20BalanceOf } from '@lib/erc20'
import type { Token } from '@lib/token'

export async function getInchStakingBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  return (await getERC20BalanceOf(ctx, [staker] as Token[])).map((res) => ({ ...res, category: 'stake' }))
}
