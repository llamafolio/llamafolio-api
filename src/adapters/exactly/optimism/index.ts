import type { AdapterConfig } from "@lib/adapter";import { getExactlyBalances, getExactlyIncentive } from '@adapters/exactly/common/balance'
import { getExactlyMarkets } from '@adapters/exactly/common/market'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = { chain: 'optimism', address: '0xaeb62e6f27bc103702e7bc879ae98bcea56f027e' }
const rewardPool: Contract = {
  chain: 'optimism',
  address: '0xbd1ba78a3976cab420a9203e6ef14d18c2b2e031',
  token: '0x4200000000000000000000000000000000000042',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getExactlyMarkets(ctx, lendingPool)

  return {
    contracts: { markets, rewardPool },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getExactlyBalances,
    rewardPool: getExactlyIncentive,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1678233600,
                  }
                  