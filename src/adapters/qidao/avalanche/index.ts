import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0xfA19c1d104F4AEfb8d5564f02B3AdCa1b515da58',
  // "0xC3537ef04Ad744174A4A4a91AfAC4Baf0CF80cB3",
  // "0xF8AC186555cbd5104c0e8C5BacF8bB779a3869f5",
  // "0xEa88eB237baE0AE26f4500146c251d25F409FA32",
  // "0x8Edc3fB6Fcdd5773216331f74AfDb6a2a2E16dc9",
  //"0x13a7fe3ab741ea6301db8b164290be711f546a73",
  '0x73a755378788a4542a780002a75a7bae7f558730',
  '0xa9122dacf3fccf1aae6b8ddd1f75b6267e5cbbb8',
  '0x1f8f7a1d38e41eaf0ed916def29bdd13f2a3f11a',
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
  startDate: 1637020800,
}
