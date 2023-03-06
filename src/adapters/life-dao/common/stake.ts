import { Balance, Contract } from '@lib/adapter'
import { BalancesContext } from '@lib/adapter'

const LF: Contract = {
  name: 'Life',
  chain: 'avax',
  address: '0x5684a087C739A2e845F4AaAaBf4FBd261edc2bE8',
  symbol: 'LF',
  decimals: 9,
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const amount = contract.amount

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
