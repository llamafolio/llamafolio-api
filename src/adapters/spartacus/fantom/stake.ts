import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'

const SPA: Contract = {
  name: 'Spartacus ',
  displayName: 'Spartacus ',
  chain: 'fantom',
  address: '0x5602df4A94eB6C680190ACCFA2A475621E0ddBdc',
  decimals: 9,
  symbol: 'SPA',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = balanceOfRes

  const balance: Balance = {
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [SPA],
    category: 'stake',
  }

  balances.push(balance)

  return balances
}
