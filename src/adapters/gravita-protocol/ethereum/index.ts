import { getGravitaLendBalances } from '@adapters/gravita-protocol/common/lend'
import { getGravitaStakeBalance } from '@adapters/gravita-protocol/common/stake'
import { getCollateralVessel } from '@adapters/gravita-protocol/common/vessel'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stabilityPool: Contract = {
  chain: 'ethereum',
  address: '0x4f39f12064d83f6dd7a2bdb0d53af8be560356a6',
}

const borrowerOperations: Contract = {
  name: 'Borrower Operations',
  chain: 'ethereum',
  address: '0x2bca0300c2aa65de6f19c2d241b54a445c9990e2',
}

const vesselManager: Contract = {
  chain: 'ethereum',
  address: '0xdB5DAcB1DFbe16326C3656a88017f0cB4ece0977',
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

export const config: AdapterConfig = {
  startDate: 1684281600,
}
