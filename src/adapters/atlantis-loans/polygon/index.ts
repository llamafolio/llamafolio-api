import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'

const Comptroller: Contract = {
  chain: 'polygon',
  address: '0x8f85ee1c0a96734cb76870106dd9c016db6de09a',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // aBNB -> WBNB
      '0xa65722af4957cef481edb4cb255f804dd36e8adc': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
  })

  return {
    contracts: { markets, Comptroller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    balances,
    healthFactor,
  }
}
