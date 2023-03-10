import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const comptrollerAddress = '0x0f390559f258eb8591c8e31cf0905e97cf36ace2'

  const pools = await getMarketsContracts('fantom', {
    // hundred-finance comptroller on Fantom chain
    comptrollerAddress,
    underlyingAddressByMarketAddress: {
      // hFTM -> wFTM
      '0xfcd8570ad81e6c77b8d252bebeba62ed980bd64d': '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
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
