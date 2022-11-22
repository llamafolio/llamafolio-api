import { GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const comptrollerAddress = '0xEdBA32185BAF7fEf9A26ca567bC4A6cbe426e499'

  const pools = await getMarketsContracts('polygon', {
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

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const balances = await getMarketsBalances(ctx, 'polygon', pools || [])

  return {
    balances,
  }
}
