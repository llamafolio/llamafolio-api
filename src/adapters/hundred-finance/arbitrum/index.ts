import { GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const comptrollerAddress = '0x0f390559f258eb8591c8e31cf0905e97cf36ace2'

  const pools = await getMarketsContracts('arbitrum', {
    // hundred-finance comptroller on Arbitrum chain
    comptrollerAddress,
    underlyingAddressByMarketAddress: {
      // hETH -> wETH
      '0x8e15a22853a0a60a0fbb0d875055a8e66cff0235': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    },
  })

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const balances = await getMarketsBalances(ctx, 'arbitrum', pools || [])

  return {
    balances,
  }
}
