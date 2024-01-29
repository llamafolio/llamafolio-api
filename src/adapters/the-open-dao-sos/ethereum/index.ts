import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getOpenDaoBalances } from './balance'

const veSOS: Contract = {
  chain: 'ethereum',
  address: '0xedd27c961ce6f79afc16fd287d934ee31a90d7d1',
  decimals: 18,
  symbol: 'veSOS',
  underlyings: ['0x3b484b82567a09e2588A13D54D032153f0c0aEe0'],
}

export const getContracts = () => {
  return {
    contracts: { veSOS },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    veSOS: getOpenDaoBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1642118400,
                  }
                  