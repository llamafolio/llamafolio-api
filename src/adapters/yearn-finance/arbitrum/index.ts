import { getPoolsContracts } from '@adapters/curve-dex/common/pool'
import { getRegistries } from '@adapters/curve-dex/common/registries'
import { getYearnBalances } from '@adapters/yearn-finance/common/balance'
import { getYearnVaults } from '@adapters/yearn-finance/common/vault'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts(ctx, registries)
  const vaults = await getYearnVaults(ctx, pools)

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
