import type { Balance, Contract } from '@lib/adapter'
import type { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers/lib/ethers'

export async function getStakeBalance(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const underlyings = contract.underlyings?.[0] as Contract

  const balanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = BigNumber.from(balanceOfRes)

  const balance: Balance = {
    ...contract,
    amount,
    underlyings: [{ ...underlyings, amount }],
    rewards: undefined,
    category: 'stake',
  }

  return balance
}
