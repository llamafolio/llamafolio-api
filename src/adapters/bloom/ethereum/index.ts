import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const TBY_feb1924: Contract = {
  chain: 'ethereum',
  address: '0xc4cafefbc3dfea629c589728d648cb6111db3136',
  underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
}

export const getContracts = () => {
  return {
    contracts: { TBY_feb1924 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    TBY_feb1924: getSingleStakeBalance,
  })

  return {
    groups: [{ balances: balances.map((balance) => ({ ...balance, category: 'farm' })) }],
  }
}

export const config: AdapterConfig = {
  startDate: 1693353600,
}
