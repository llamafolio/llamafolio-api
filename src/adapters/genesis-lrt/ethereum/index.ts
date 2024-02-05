import { getGenBalance } from '@adapters/genesis-lrt/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const genETH: Contract = {
  chain: 'ethereum',
  address: '0xf073bac22dab7faf4a3dd6c6189a70d54110525c',
  decimals: 18,
  symbol: 'genETH',
}

export const getContracts = async () => {
  return {
    contracts: { genETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, { genETH: getGenBalance })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1705276800,
}
