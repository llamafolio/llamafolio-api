import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export const get_xLP_UnderlyingsBalances = async (
  ctx: BalancesContext,
  balances: Balance[],
  vault: Contract,
): Promise<Balance[]> => {
  const fmtBalances: Balance[] = []

  for (const balance of balances) {
    const underlyings = balance.underlyings as Contract[]
    if (!underlyings) {
      continue
    }

    const [totalSupply, underlyingsBalancesOfsRes] = await Promise.all([
      call({ ctx, target: balance.address, abi: erc20Abi.totalSupply }),
      multicall({
        ctx,
        calls: underlyings.map((underlying) => ({
          target: (underlying as Contract).address,
          params: [vault.address],
        })),
        abi: erc20Abi.balanceOf,
      }),
    ])

    const fmtUnderlyings: Contract[] = underlyings.map((underlying, idx) => {
      const underlyingsBalancesOfRes = underlyingsBalancesOfsRes[idx]
      const underlyingsAmount = balance.amount.mul(underlyingsBalancesOfRes.output).div(totalSupply)
      return { ...(underlying as Contract), amount: underlyingsAmount }
    })

    fmtBalances.push({
      ...balance,
      amount: balance.amount,
      underlyings: fmtUnderlyings,
      rewards: balance.rewards,
      category: balance.category,
    })
  }

  return fmtBalances
}
