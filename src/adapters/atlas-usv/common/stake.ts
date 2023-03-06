import { Balance, Contract } from '@lib/adapter'
import { BalancesContext } from '@lib/adapter'
import { Token } from '@lib/token'

// multi-chain underlying token
const USV: Token = {
  chain: 'ethereum',
  address: '0x88536C9B2C4701b8dB824e6A16829D5B5Eb84440',
  symbol: 'USV',
  decimals: 9,
}

export async function getStakeBalance(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balance: Balance = {
    ...contract,
    amount: contract.amount,
    underlyings: [{ ...USV, amount: contract.amount }],
    rewards: undefined,
    category: 'stake',
  }

  return balance
}
