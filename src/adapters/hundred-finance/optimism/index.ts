import { GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const comptrollerAddress = '0x0f390559f258eb8591c8e31cf0905e97cf36ace2'

  const pools = await getMarketsContracts('optimism', {
    // hundred-finance comptroller on Optimism chain
    comptrollerAddress,
    underlyingAddressByMarketAddress: {
      // hETH -> wETH
      '0xe8f12f5492ec28609d2932519456b7436d6c93bd': '0x4200000000000000000000000000000000000006',
    },
  })

  return {
    contracts: {
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const balances = await getMarketsBalances(ctx, 'optimism', pools || [])

  return {
    balances,
  }
}
