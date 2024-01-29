import type { AdapterConfig } from "@lib/adapter";import { getdHedgeBalances } from '@adapters/dhedge/common/balance'
import { getdHedgePools } from '@adapters/dhedge/common/pool'
import { getDHTStakeBalances } from '@adapters/dhedge/optimism/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sUSD: Contract = {
  chain: 'optimism',
  address: '0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9',
  decimals: 18,
  symbol: 'sUSD',
}

const DHT: Contract = {
  chain: 'optimism',
  address: '0xaf9fe3b5ccdae78188b1f8b9a49da7ae9510f151',
  decimals: 18,
  symbol: 'DHT',
}

const staker: Contract = {
  chain: 'optimism',
  address: '0xf165ca3d75120d817b7428eef8c39ea5cb33b612',
  underlyings: [DHT, sUSD],
}

const factory: Contract = {
  chain: 'optimism',
  address: '0x5e61a079A178f0E5784107a4963baAe0c5a680c6',
}

const poolPerformance: Contract = {
  chain: 'optimism',
  address: '0x0896A33E351fb11f405d3E9c03f4D4Fc667894a8',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getdHedgePools(ctx, factory, sUSD)

  return {
    contracts: { pools, staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getdHedgeBalances(...args, poolPerformance),
    staker: (...args) => getDHTStakeBalances(...args, poolPerformance),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1686355200,
                  }
                  