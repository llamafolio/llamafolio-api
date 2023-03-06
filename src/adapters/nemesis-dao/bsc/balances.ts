import { Balance, BalancesContext, Contract } from '@lib/adapter'

const NMS: Contract = {
  name: 'Nemesis DAO',
  chain: 'bsc',
  address: '0x8AC9DC3358A2dB19fDd57f433ff45d1fc357aFb3',
  decimals: 9,
  symbol: 'NMS',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = contract.amount

  balances.push({
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount: balanceOf,
    underlyings: [NMS],
    category: 'stake',
  })

  return balances
}
