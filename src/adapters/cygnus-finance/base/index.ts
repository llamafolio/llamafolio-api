import { getCygnusBalances } from '@adapters/cygnus-finance/base/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const cgUSD: Contract = {
  chain: 'base',
  address: '0xca72827a3d211cfd8f6b00ac98824872b72cab49',
  underlyings: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
  decimals: 6,
  symbol: 'cgUSD',
}

const wcgUSD: Contract = {
  chain: 'base',
  address: '0x5ae84075f0e34946821a8015dab5299a00992721',
  token: '0xca72827a3d211cfd8f6b00ac98824872b72cab49',
  underlyings: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
  decimals: 6,
  symbol: 'cgUSD',
}

export const getContracts = () => {
  return {
    contracts: { pools: [cgUSD, wcgUSD] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getCygnusBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1709251200,
}
