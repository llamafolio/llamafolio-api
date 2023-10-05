import { getYearnBalances } from '@adapters/yearn-finance/common/balance'
import { getYearnVaults, mergeContracts } from '@adapters/yearn-finance/common/vault'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getYearnVaults(ctx)

  const fmtAeroVaults = await getPairsDetails(
    ctx,
    vaults.map((vault) => ({ ...vault, address: vault.lpToken, staker: vault.address })),
  )

  fmtAeroVaults.forEach((vault) => {
    vault.address = vault.staker
  })

  mergeContracts(vaults, fmtAeroVaults)

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
