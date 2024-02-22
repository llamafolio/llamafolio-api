import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0x8ab01c5ee3422099156ab151eecb83c095626599',
  '0x7f9dd991e8fd0cbb52cb8eb35dd35c474a9a7a70',
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
  startDate: 1708594979,
}
