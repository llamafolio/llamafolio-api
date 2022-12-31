import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call, TCall } from '@lib/call'
import { Category } from '@lib/category'
import { abi as erc20ABI, getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

export async function getSingleStakeBalance(ctx: BalancesContext, contract: Contract, callOptions?: Partial<TCall>) {
  const amountRes = await call({
    chain: ctx.chain,
    abi: erc20ABI.balanceOf,
    target: contract.address,
    params: [ctx.address],
    ...callOptions,
  })

  const amount = BigNumber.from(amountRes.output)

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
