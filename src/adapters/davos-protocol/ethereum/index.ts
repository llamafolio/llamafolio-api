import { getDavosLendingBalances } from '@adapters/davos-protocol/common/balance'
import { getDavosVaults } from '@adapters/davos-protocol/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'

const vaultAddresses: `0x${string}`[] = [
  '0xd25b3dbb79888f548ccfb3ffcf530fb0cb69bc4f',
  '0x573674618c934c14f5c7cf85b5e586bae9991b63',
  '0xeed1122d9e564b9cf281ae0ce9c5590d94db52d9',
  '0x3693980607bc6d1b7384e3f484685c02be3ed0b7',
  '0x8855d3fbcda1dfccf44ac6079d093bcf3a833f2d',
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
  startDate: 1685577600,
}
