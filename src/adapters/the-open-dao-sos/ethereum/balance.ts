import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'

const FROM_veSOS_TO_SOS = 21669n // 2.1669 * 1e4 to prevent underflow

export async function getOpenDaoBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances = await getBalancesOf(ctx, [staker])

  for (const balance of balances) {
    const underlying = balance.underlyings?.[0] as Contract

    if (!underlying) {
      continue
    }

    underlying.amount = (balance.amount * FROM_veSOS_TO_SOS) / 10n ** 4n // 21669 -> 2.1669
    balance.category = 'stake'
  }

  return balances
}
