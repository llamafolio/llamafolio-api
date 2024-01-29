import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '../common/lending'

const lendingPool: Contract = {
  name: 'Pool',
  displayName: 'Pool',
  chain: 'gnosis',
  address: '0xb50201558b00496a145fe76f7424749556e326d8',
}

const poolDataProvider: Contract = {
  chain: 'gnosis',
  address: '0x501b4c19dd9c2e06e94da7b6d5ed4dda013ec741',
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
                    startDate: 1699401600,
                  }
                  