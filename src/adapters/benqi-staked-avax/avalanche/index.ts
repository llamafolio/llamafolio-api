import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBenqiBalances } from './stake'

const WAVAX: Contract = {
  name: 'Wrapped AVAX',
  chain: 'avalanche',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX ',
  decimals: 18,
}

const sAVAX: Contract = {
  name: 'Staked AVAX',
  chain: 'avalanche',
  address: '0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be',
  symbol: 'sAVAX ',
  decimals: 18,
  coingeckoId: 'benqi-liquid-staked-avax',
  category: 'stake',
  underlyings: [WAVAX],
}

export const getContracts = () => {
  return {
    contracts: { sAVAX },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sAVAX: getBenqiBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1645056000,
}
