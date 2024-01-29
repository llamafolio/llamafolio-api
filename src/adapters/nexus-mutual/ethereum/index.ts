import type { AdapterConfig, BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getStakeBalances } from './stake'

const NXM: Token = {
  chain: 'ethereum',
  address: '0xd7c49CEE7E9188cCa6AD8FF264C1DA2e69D4Cf3B',
  decimals: 18,
  symbol: 'NXM',
}

const wNXM: Token = {
  chain: 'ethereum',
  address: '0x0d438f3b5175bebc262bf23753c1e53d03432bde',
  decimals: 18,
  symbol: 'wNXM',
}

const StakeNXM: Contract = {
  name: 'Nexus Mutual Pooled Staking',
  chain: 'ethereum',
  address: '0x84EdfFA16bb0b9Ab1163abb0a13Ff0744c11272f',
  underlyings: [NXM, wNXM],
}

export const getContracts = () => {
  return {
    contracts: { StakeNXM },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    StakeNXM: getStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1558648800,
}
