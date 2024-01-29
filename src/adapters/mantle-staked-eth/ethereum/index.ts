import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const mETH: Contract = {
  chain: 'ethereum',
  address: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa',
  decimals: 18,
  symbol: 'mETH',
}

export const getContracts = () => {
  return {
    contracts: { mETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    mETH: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1701648000,
}
