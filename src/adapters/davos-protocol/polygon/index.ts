import { getDavosLendingBalances } from '@adapters/davos-protocol/common/balance'
import { getDavosVaults } from '@adapters/davos-protocol/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'

const vaultAddresses: `0x${string}`[] = [
  '0xe2023c00f78a384dd96333590aea1e3a0a91fd6a',
  '0x046b71694b3b659f491247167eda42e0556123cf',
]

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getDavosVaults(ctx, vaultAddresses)
  return {
    contracts: { vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const vaultBalances = await getDavosLendingBalances(ctx, contracts.vaults || [])

  return {
    groups: [...vaultBalances],
  }
}

export const config: AdapterConfig = {
  startDate: 1676332800,
}
