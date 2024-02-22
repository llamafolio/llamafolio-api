import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0xC76a3cBefE490Ae4450B2fCC2c38666aA99f7aa0',
  '0xB237f4264938f0903F5EC120BB1Aa4beE3562FfF',
  '0xd371281896f2F5f7A2C65F49d23A2B6ecfd594f3',
  '0xe47ca047Cb7E6A9AdE9405Ca68077d63424F34eC',
  '0xa864956ff961ce62c266a8563b46577d3573372e',
  '0x950eceee9e7d7366a24fc9d2ed4c0c37d17a0fa9',
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
  startDate: 1651276800,
}
