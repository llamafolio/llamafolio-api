import { getAsymetrixBalances } from '@adapters/asymetrix-protocol/ethereum/stake'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const PST: Contract = {
  chain: 'ethereum',
  address: '0x82d24dd5041a3eb942cca68b319f1fda9eb0c604',
  decimals: 18,
  symbol: 'PST',
  underlyings: ['0xae7ab96520de3a18e5e111b5eaab095312d7fe84'],
  staker: '0xd1c88b7cc2f9b3a23d1cb537d53a818cef5e5e32',
}

export const getContracts = () => {
  return {
    contracts: { PST },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    PST: getAsymetrixBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1682121600,
}
