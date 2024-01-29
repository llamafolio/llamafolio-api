import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const sFTMX: Contract = {
  chain: 'fantom',
  address: '0xd7028092c830b5c8fce061af2e593413ebbc1fc1',
  decimals: 18,
  symbol: 'sFTMX',
}

export const getContracts = () => {
  return {
    contracts: { sFTMX },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sFTMX: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1654560000,
}
