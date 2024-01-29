import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMorphoMarketsBalances } from './balance'
import { getUserHealthFactor } from './healthfactor'
import { getMorphoMarketsContracts } from './market'

const morphoLens: Contract = {
  chain: 'ethereum',
  address: '0x930f1b46e1d081ec1524efd95752be3ece51ef67',
}

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x8888882f8f843896699869179fb6e4f7e3b58888',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMorphoMarketsContracts(ctx, morphoLens)
  comptroller.markets = markets

  return {
    contracts: { markets, morphoLens, comptroller },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      comptroller: (...args) => getMorphoMarketsBalances(...args, morphoLens),
    }),
    getUserHealthFactor(ctx, morphoLens, contracts.markets || []),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1660867200,
                  }
                  