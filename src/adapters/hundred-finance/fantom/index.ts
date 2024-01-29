import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { getSingleLockerBalance } from '@lib/lock'

const HND: Contract = {
  chain: 'fantom',
  address: '0x10010078a54396F62c96dF8532dc2B4847d47ED3',
  decimals: 18,
  symbol: 'HND',
}

const locker: Contract = {
  chain: 'fantom',
  address: '0x376020c5b0ba3fd603d7722381faa06da8078d8a',
  decimals: 18,
  symbol: 'veHND',
}

export const getContracts = async (ctx: BaseContext) => {
  const comptrollerAddress = '0x0f390559f258eb8591c8e31cf0905e97cf36ace2'

  const pools = await getMarketsContracts(ctx, {
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
      locker,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getMarketsBalances,
    locker: (...args) => getSingleLockerBalance(...args, HND, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1638835200,
                  }
                  