import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = ['0x3A82F4da24F93a32dc3C2A28cFA9D6E63EC28531']

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
  startDate: 1667865600,
}
