import { getExtraPoolsBalances } from '@adapters/extra-finance/common/balance'
import { getExtraPools } from '@adapters/extra-finance/common/pool'
import { getExtraVaults } from '@adapters/extra-finance/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'base',
  address: '0xbb505c54d71e9e599cb8435b4f0ceec05fc71cbd',
}

const factory: Contract = {
  chain: 'base',
  address: '0xf9cfb8a62f50e10adde5aa888b44cf01c5957055',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, vaults] = await Promise.all([getExtraPools(ctx, lendingPool), getExtraVaults(ctx, factory)])

  return {
    contracts: { pools, vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getExtraPoolsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
