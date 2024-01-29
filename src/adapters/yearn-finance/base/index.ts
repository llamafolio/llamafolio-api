import { getYearnBalances } from '@adapters/yearn-finance/common/balance'
import { getYearnVaults } from '@adapters/yearn-finance/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getPairsDetails(ctx, await getYearnVaults(ctx))

  return {
    contracts: { vaults },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getYearnBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1695168000,
}
