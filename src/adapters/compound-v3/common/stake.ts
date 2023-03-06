import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Token } from '@lib/token'

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  balances.push({
    chain: ctx.chain,
    address: USDC.address,
    decimals: USDC.decimals,
    symbol: USDC.symbol,
    amount: contract.amount,
    category: 'stake',
  })

  return balances
}
