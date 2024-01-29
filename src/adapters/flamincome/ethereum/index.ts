import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFlamincomeFarmBalances } from './stake'

const vaultBaselineBTC: Contract = {
  chain: 'ethereum',
  address: '0x1a389c381a8242b7acff0eb989173cd5d0efc3e3',
  token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  underlyings: ['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'],
}

const vaultBaselineUSDT: Contract = {
  chain: 'ethereum',
  address: '0x54be9254adf8d5c8867a91e44f44c27f0c88e88a',
  token: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  underlyings: ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
}

const vaultBaselineETH: Contract = {
  chain: 'ethereum',
  address: '0x1e9dc5d843731d333544e63b2b2082d21ef78ed3',
  token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

export const getContracts = () => {
  return {
    contracts: { farmers: [vaultBaselineBTC, vaultBaselineUSDT, vaultBaselineETH] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getFlamincomeFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1600473600,
}
