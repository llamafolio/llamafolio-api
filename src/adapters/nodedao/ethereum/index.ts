import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getERC20BalanceOf } from '@lib/erc20'
import type { Token } from '@lib/token'

const nETH: Token = {
  chain: 'ethereum',
  address: '0xC6572019548dfeBA782bA5a2093C836626C7789A',
  name: 'Node ETH',
  symbol: 'nETH',
  decimals: 18,
}

export const getContracts = async () => {
  return {
    contracts: { nETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    nETH: (ctx, nETH) => getERC20BalanceOf(ctx, [nETH]),
  })

  return {
    groups: [{ balances }],
  }
}
