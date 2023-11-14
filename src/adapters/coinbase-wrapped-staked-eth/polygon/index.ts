import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const cbETH: Token = {
  chain: 'polygon',
  address: '0x4b4327db1600b8b1440163f667e199cef35385f5',
  name: 'Coinbase Wrapped Staked ETH',
  symbol: 'CBETH',
  decimals: 18,
}

export const getContracts = async () => {
  return {
    contracts: { cbETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    cbETH: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
