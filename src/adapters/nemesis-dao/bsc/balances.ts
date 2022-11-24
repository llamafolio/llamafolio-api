import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contract?: Contract) {
  if (!contract || !contract.underlyings?.[0]) {
    return []
  }

  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = BigNumber.from(balanceOfRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount: balanceOf,
    underlyings: [{ ...contract.underlyings?.[0], amount: balanceOf }],
    category: 'stake',
  }

  balances.push(balance)

  return balances
}
