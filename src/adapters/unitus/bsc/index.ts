import type { AdapterConfig } from "@lib/adapter";import { getAllUnitusMarkets, getUnitusMarketsInfos } from '@adapters/unitus/common/lend'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const comptroller: Contract = {
  chain: 'bsc',
  address: '0x0b53e608bd058bb54748c35148484fd627e6dc0a',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    getAllMarkets: getAllUnitusMarkets,
    getMarketsInfos: getUnitusMarketsInfos,
  })

  return {
    contracts: { markets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1702944000,
                  }
                  