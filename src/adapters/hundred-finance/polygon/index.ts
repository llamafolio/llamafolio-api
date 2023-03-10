import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'

export const getContracts = async (ctx: BaseContext) => {
  const comptrollerAddress = '0xEdBA32185BAF7fEf9A26ca567bC4A6cbe426e499'

  const pools = await getMarketsContracts(ctx, {
    // hundred-finance comptroller on Polygon chain
    comptrollerAddress,
    underlyingAddressByMarketAddress: {
      // hMATIC -> wMATIC
      '0xebd7f3349aba8bb15b897e03d6c1a4ba95b55e31': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
  })

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
