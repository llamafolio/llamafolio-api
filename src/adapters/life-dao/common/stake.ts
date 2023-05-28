import type { Balance, Contract } from '@lib/adapter'
import type { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'

const LF: Contract = {
  name: 'Life',
  chain: 'avalanche',
  address: '0x5684a087C739A2e845F4AaAaBf4FBd261edc2bE8',
  symbol: 'LF',
  decimals: 9,
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const amount = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  balances.push({
    chain: ctx.chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount,
    underlyings: [{ ...LF, amount }],
    category: 'stake',
  })

  return balances
}
