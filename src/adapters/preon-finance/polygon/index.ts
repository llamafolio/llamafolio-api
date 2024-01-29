import type { AdapterConfig } from "@lib/adapter";import { getPreonBalances } from '@adapters/preon-finance/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const WMATIC: Contract = {
  chain: 'polygon',
  address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  decimals: 18,
  symbol: 'WMATIC',
}
const stMATIC: Contract = {
  chain: 'polygon',
  address: '0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4',
  decimals: 18,
  symbol: 'stMATIC',
}

const vesselManager: Contract = {
  chain: 'polygon',
  address: '0x5208c0c4c95a4636efc403960969a4a4b4ccdfc5',
}

export const getContracts = () => {
  return {
    contracts: { assets: [WMATIC, stMATIC] },
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
                  