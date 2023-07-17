import { getExtraPoolsBalances } from '@adapters/extra-finance/optimism/balance'
import { getExtraPools } from '@adapters/extra-finance/optimism/pool'
import { getExtraVaults } from '@adapters/extra-finance/optimism/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

const EXTRA: Token = {
  chain: 'optimism',
  address: '0x2dad3a13ef0c6366220f989157009e501e7938f8',
  decimals: 18,
  symbol: 'EXTRA',
}

const lendingPool: Contract = {
  chain: 'optimism',
  address: '0xbb505c54d71e9e599cb8435b4f0ceec05fc71cbd',
}

const factory: Contract = {
  chain: 'optimism',
  address: '0xf9cfb8a62f50e10adde5aa888b44cf01c5957055',
}

const locker: Contract = {
  chain: 'optimism',
  address: '0xe0bec4f45aef64cec9dcb9010d4beffb13e91466',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, vaults] = await Promise.all([getExtraPools(ctx, lendingPool), getExtraVaults(ctx, factory)])

  return {
    contracts: { pools, locker, vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getExtraPoolsBalances,
    locker: (...args) => getSingleLockerBalance(...args, EXTRA, 'lockedBalances'),
  })

  return {
    groups: [{ balances }],
  }
}
