import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0x60d133c666919B54a3254E0d3F14332cB783B733',
  '0xEcbd32bD581e241739be1763DFE7a8fFcC844ae1',
  '0x98eb27E5F24FB83b7D129D789665b08C258b4cCF',
  '0x8C45969aD19D297c9B85763e90D0344C6E2ac9d1',
  '0xcc61Ee649A95F2E2f0830838681f839BDb7CB823',
  '0x82E90EB7034C1DF646bD06aFb9E67281AAb5ed28',
  '0xCA3EB45FB186Ed4e75B9B22A514fF1d4abAdD123',
  '0x4ce4C542D96Ce1872fEA4fa3fbB2E7aE31862Bad',
  '0x5773e8953cf60f495eb3c2db45dd753b5c4b7473',
  '0x954ac12c339c60eafbb32213b15af3f7c7a0dec2',
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
  startDate: 1663718400,
}
