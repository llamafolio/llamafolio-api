import { getFractionalVaults, getFractionalVaultsBalances } from '@adapters/fractional-art/ethereum/vault'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'ethereum',
  address: '0x85aa7f78bdb2de8f3e0c0010d99ad5853ffcfc63',
}

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getFractionalVaults(ctx, factory)

  return {
    contracts: { factory, vaults },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getFractionalVaultsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1627257600,
}
