import type { AdapterConfig } from "@lib/adapter";import { getMendiStakeBalances } from '@adapters/mendi-finance/linea/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const stakers: Contract[] = [
  {
    chain: 'linea',
    address: '0x150b1e51738cdf0ccfe472594c62d7d6074921ca',
    underlyings: ['0x43e8809ea748eff3204ee01f08872f063e44065f'],
  },
  {
    chain: 'linea',
    address: '0xcf8dedcdc62317beaedfbee3c77c08425f284486',
    underlyings: ['0x43e8809ea748eff3204ee01f08872f063e44065f'],
  },
]

const comptroller: Contract = {
  chain: 'linea',
  address: '0x1b4d3b0421ddc1eb216d230bc01527422fb93103',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
  })

  return {
    contracts: {
      markets,
      stakers,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    stakers: getMendiStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1692576000,
                  }
                  