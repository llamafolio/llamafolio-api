import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20ABI, getBalancesOf } from '@lib/erc20'
import type { Token } from '@lib/token'

export async function getSingleStakeBalance(ctx: BalancesContext, contract: Contract, options?: any) {
  const amount = await call({
    ctx,
    abi: erc20ABI.balanceOf,
    target: contract.address,
    params: [ctx.address],
    ...options,
  })
  const balance: Balance = { ...(contract as Balance), amount, category: 'stake' }

  return balance
}

export async function getSingleStakeBalances(ctx: BalancesContext, contracts: Contract[]) {
  const { erc20: balances } = await getBalancesOf(ctx, contracts as Token[])
  return balances.map((bal) => ({ ...bal, category: 'stake' as Category }))
}
