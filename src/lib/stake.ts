import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20ABI, getBalancesOf } from '@lib/erc20'

export async function getSingleStakeBalance(ctx: BalancesContext, contract: Contract, options?: any) {
  const amount = await call({
    ctx,
    abi: erc20ABI.balanceOf,
    target: contract.address,
    params: [ctx.address],
    ...options,
  })

  return { ...(contract as Balance), amount, category: 'stake' } as Balance
}

export async function getSingleStakeBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances = await getBalancesOf(ctx, contracts)
  return balances.map((bal) => ({ ...bal, category: 'stake' as Category }))
}
