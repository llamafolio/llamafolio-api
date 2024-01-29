import { getPreonBalances } from '@adapters/preon-finance/common/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const WETH: Contract = {
  chain: 'arbitrum',
  address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  decimals: 18,
  symbol: 'WETH',
}
const wstETH: Token = {
  chain: 'arbitrum',
  address: '0x5979D7b546E38E414F7E9822514be443A4800529',
  decimals: 18,
  symbol: 'wstETH',
}

const vesselManager: Contract = {
  chain: 'arbitrum',
  address: '0x5208c0c4c95a4636efc403960969a4a4b4ccdfc5',
}

export const getContracts = () => {
  return {
    contracts: { assets: [WETH, wstETH] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assets: (...args) => getPreonBalances(...args, vesselManager),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1691280000,
}
