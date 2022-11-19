import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call, TCall } from '@lib/call'
import { Category } from '@lib/category'
import { Chain } from '@lib/chains'
import { abi as erc20ABI, getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

export async function getSingleStakeBalance(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract,
  callOptions?: Partial<TCall>,
) {
  const amountRes = await call({
    chain,
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

export async function getSingleStakeBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const balances = await getERC20BalanceOf(ctx, chain, contracts as Token[])
  return balances.map((bal) => ({ ...bal, category: 'stake' as Category }))
}
