import { getGravitaLendBalances } from '@adapters/gravita-protocol/common/lend'
import { getGravitaStakeBalance } from '@adapters/gravita-protocol/common/stake'
import { getCollateralVessel } from '@adapters/gravita-protocol/common/vessel'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stabilityPool: Contract = {
  chain: 'arbitrum',
  address: '0x0a3137e103a8f268fa065f6d5922ed6173b7bdfa',
}

const borrowerOperations: Contract = {
  name: 'Borrower Operations',
  chain: 'arbitrum',
  address: '0x89f1eccf2644902344db02788a790551bb070351',
}

const vesselManager: Contract = {
  chain: 'arbitrum',
  address: '0x6adaa3eba85c77e8566b73aefb4c2f39df4046ca',
}

export const getContracts = async (ctx: BaseContext) => {
  const assets = await getCollateralVessel(ctx, stabilityPool)

  return {
    contracts: { assets, borrowerOperations, stabilityPool },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getGravitaLendBalances(ctx, contracts.assets || [], vesselManager),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      stabilityPool: (...args) => getGravitaStakeBalance(...args, contracts.assets || []),
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}
