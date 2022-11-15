import { Chain } from '@defillama/sdk/build/general'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const balances: Balance[] = await getERC20BalanceOf(ctx, chain, contracts as Token[])

  // use the same amount for underlyings
  for (const balance of balances) {
    if (balance.amount.gt(0) && balance.underlyings) {
      balance.underlyings[0] = {
        ...balance.underlyings[0],
        amount: BigNumber.from(balance.amount),
      }
    }
  }

  return balances
}
