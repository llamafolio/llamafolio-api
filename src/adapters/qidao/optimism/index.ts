import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0x062016cd29fabb26c52bab646878987fc9b0bc55',
  '0xb9c8f0d3254007ee4b98970b94544e473cd610ec',
  '0xbf1aea8670d2528e08334083616dd9c5f3b087ae',
  '0xF9CE2522027bD40D3b1aEe4abe969831FE3BeAf5',
  '0xAB91c51b55F7Dd7B34F2FD7217506fD5b632B2B9',
  '0xB89c1b3d9f335B9d8Bb16016F3d60160AE71041f',
  '0x86f78d3cbca0636817ad9e27a44996c738ec4932',
  '0xa478E708A27853848C6Bc979668fe6225FEe46Fa',
  '0x7198ff382b5798dab7dc72a23c1fec9dc091893b',
  '0xc88c8ada95d92c149377aa660837460775dcc6d9',
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
