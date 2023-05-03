import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getERC20BalanceOf } from '@lib/erc20'
import type { Token } from '@lib/token'

const FROM_veSOS_TO_SOS = 21669 // 2.1669 * 1e4 to prevent underflow

export async function getOpenDaoBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances = await getERC20BalanceOf(ctx, [staker] as Token[])

  for (const balance of balances) {
    const underlying = balance.underlyings?.[0] as Contract

    if (!underlying) {
      continue
    }

    underlying.amount = balance.amount.mul(FROM_veSOS_TO_SOS).div(1e4) // 21669 -> 2.1669
    balance.category = 'stake'
  }

  return balances
}
