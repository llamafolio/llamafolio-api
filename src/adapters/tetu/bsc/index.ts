import { getTetuVaultBalances } from '@adapters/tetu/common/farm'
import { getTetuVaults } from '@adapters/tetu/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'bsc',
  address: '0x8A571137DA0d66c2528DA3A83F097fbA10D28540',
}

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getTetuVaults(ctx, factory)

  return {
    contracts: { vaults },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getTetuVaultBalances,
  })

  return {
    groups: [{ balances }],
  }
}
