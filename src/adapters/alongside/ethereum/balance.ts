import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getAMKTBalance(
  ctx: BalancesContext,
  staker: Contract,
  vault: Contract,
): Promise<Balance | undefined> {
  const underlyings = staker.underlyings as Contract[]
  if (!underlyings) return

  const [userBalance, totalSupply, tokensBalances] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: underlyings.map((underlying) => ({ target: underlying.address, params: [vault.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
  ])

  const fmtUnderlyings = mapSuccessFilter(tokensBalances, (res, index) => {
    return { ...underlyings[index], amount: (userBalance * res.output) / totalSupply }
  })

  return {
    ...staker,
    amount: userBalance,
    underlyings: fmtUnderlyings,
    rewards: undefined,
    category: 'stake',
  }
}
