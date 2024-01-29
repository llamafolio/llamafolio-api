import { getLayerBankMarketsBalances } from '@adapters/layerbank/linea/balance'
import {
  getCollateralFactor,
  getLayerBankAllMarkets,
  getLayerBankMarketsInfos,
} from '@adapters/layerbank/linea/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsContracts } from '@lib/compound/v2/market'

const comptroller: Contract = {
  chain: 'linea',
  address: '0x009a0b7c38b542208936f1179151cd08e2943833',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    getAllMarkets: getLayerBankAllMarkets,
    getMarketsInfos: getLayerBankMarketsInfos,
    getCollateralFactor: getCollateralFactor,
  })

  return {
    contracts: {
      markets,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getLayerBankMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1689724800,
}
