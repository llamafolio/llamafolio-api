import { getExactlyBalances } from '@adapters/exactly/common/balance'
import { getExactlyMarkets } from '@adapters/exactly/common/market'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = { chain: 'ethereum', address: '0x310a2694521f75c7b2b64b5937c16ce65c3efe01' }

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getExactlyMarkets(ctx, lendingPool)

  return {
    contracts: { markets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getExactlyBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1667260800,
}
