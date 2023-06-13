import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import type { Token } from '@lib/token'

export async function getInchStakingBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  return (await getBalancesOf(ctx, [staker] as Token[])).slice(1).map((res) => ({ ...res, category: 'stake' }))
}
