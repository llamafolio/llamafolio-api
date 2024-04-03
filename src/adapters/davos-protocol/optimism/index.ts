import { getDavosLendingBalances } from '@adapters/davos-protocol/common/balance'
import { getDavosVaults } from '@adapters/davos-protocol/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'

const vaultAddresses: `0x${string}`[] = [
  '0x7a447d3fa34715010273a17c3fd29eb3926d7f2c',
  '0x86e956154df2cd9495b6d92d9b0c2b00f8e390b1',
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
  startDate: 1702339200,
}
