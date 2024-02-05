import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getDefiplazaLpBalance(ctx: BalancesContext, lp: Contract): Promise<Balance> {
  const amount = await call({
    ctx,
    target: lp.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const lpBalance: Balance = {
    ...(lp as Balance),
    amount,
    category: 'lp',
  }

  return getUnderlyingBalances(ctx, lpBalance)
}

async function getUnderlyingBalances(ctx: BalancesContext, lp: Balance): Promise<Balance> {
  const underlyings = lp.underlyings as Contract[]

  const [tokenBalances, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: underlyings.map((underlying) => ({ target: underlying.address, params: [lp.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    call({ ctx, target: lp.address, abi: erc20Abi.totalSupply }),
  ])

  underlyings.forEach((underlying, index) => {
    const tokenBalance = tokenBalances[index].success ? tokenBalances[index].output : 0n
    if (totalSupply === 0n) return
    underlying.amount = (tokenBalance! * lp.amount) / totalSupply
  })

  return { ...lp, underlyings }
}
