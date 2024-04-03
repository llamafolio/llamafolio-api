import { getDavosLendingBalances } from '@adapters/davos-protocol/common/balance'
import { getDavosVaults } from '@adapters/davos-protocol/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'

const vaultAddresses: `0x${string}`[] = [
  '0x7ef3991f54d2cbefe247c2ff7c35a8a9609dcefa',
  '0x601ab2230c2f7b8e719a0111febdfa94bb462c69',
  '0x5a691001bf7065a17e150681f5bfbd7bc45a668e',
  '0x9c44e6a927302da33dd76abe4558f26e31c48019',
  '0x02c7420407a6439d49e9816399a5d5b03187363b',
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
