import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '../common/lending'

const lendingPool: Contract = {
  name: 'Pool',
  displayName: 'Pool',
  chain: 'ethereum',
  address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
}

const poolDataProvider: Contract = {
  chain: 'ethereum',
  address: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
  name: 'Pool Data Provider',
  displayName: 'Aave: Pool Data Provider V3',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts(ctx, lendingPool, poolDataProvider)

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: getLendingPoolBalances,
    }),
    getLendingPoolHealthFactor(ctx, lendingPool),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1674604800,
                  }
                  