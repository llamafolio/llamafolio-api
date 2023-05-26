import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20ABI, getERC20BalanceOf } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

export async function getSingleStakeBalance(ctx: BalancesContext, contract: Contract, callOptions?: any) {
  const amountRes = await call({
    ctx,
    abi: erc20ABI.balanceOf,
    target: contract.address,
    params: [ctx.address],
    ...callOptions,
  })

  const amount = BigNumber.from(amountRes)

  const balance: Balance = {
    ...(contract as Balance),
    amount,
    category: 'stake',
  }

  return balance
}

export async function getSingleStakeBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances = await getERC20BalanceOf(ctx, contracts as Token[])
  return balances.map((bal) => ({ ...bal, category: 'stake' as Category }))
}
