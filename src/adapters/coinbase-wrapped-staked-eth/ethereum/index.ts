import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getERC20BalanceOf } from '@lib/erc20'
import type { Token } from '@lib/token'

const cbETH: Token = {
  chain: 'ethereum',
  address: '0xbe9895146f7af43049ca1c1ae358b0541ea49704',
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
    cbETH: (ctx, cbETH) => getERC20BalanceOf(ctx, [cbETH]),
  })

  return {
    groups: [{ balances }],
  }
}
