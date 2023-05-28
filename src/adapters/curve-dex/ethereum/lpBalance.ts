import type { Balance, BalancesContext, Contract } from '@lib/adapter'

import { getPoolsBalances } from '../common/balance'

export async function getLpCurveBalances(
  ctx: BalancesContext,
  pools: Contract[],
  registry: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const lpBalances = await getPoolsBalances(ctx, pools, registry, true)

  for (const lpBalance of lpBalances) {
    const underlyings = lpBalance.underlyings as Contract[]

    if (!underlyings) {
      continue
    }

    //  Tokemak reactor's underlyings act as duplicate with abnormal balances because tTokens are not known.

    if (underlyings[0].symbol !== `t${underlyings[1].symbol}`) {
      balances.push(lpBalance)
    } else {
      balances.push({
        ...lpBalance,
        underlyings: [{ ...underlyings[1], amount: underlyings[1].amount + underlyings[0].amount }],
      })
    }
  }

  return balances
}
