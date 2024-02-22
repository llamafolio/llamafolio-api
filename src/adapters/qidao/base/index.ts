import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0x7333fd58d8d73a8e5fc1a16c8037ada4f580fa2b',
  '0x8d6cebd76f18e1558d4db88138e2defb3909fad6',
  '0x654a31ba7d714cfcab19b17d0066171c1a292349',
]

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getQidaoVaults(ctx, vaultsAddresses)
  return {
    contracts: { vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getQidaoVaultsBalances(ctx, contracts.vaults || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {}),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1693440000,
}
