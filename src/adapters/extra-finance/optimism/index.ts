import { getExtraPoolsBalances } from '@adapters/extra-finance/common/balance'
import { getExtraPools } from '@adapters/extra-finance/common/pool'
import { getExtraVaults } from '@adapters/extra-finance/common/vault'
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

const poolManager: Contract = {
  chain: 'optimism',
  address: '0xbb505c54d71e9e599cb8435b4f0ceec05fc71cbd',
}

const vaultManager: Contract = {
  chain: 'optimism',
  address: '0xf9cfb8a62f50e10adde5aa888b44cf01c5957055',
}

const locker: Contract = {
  chain: 'optimism',
  address: '0xe0bec4f45aef64cec9dcb9010d4beffb13e91466',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, vaults] = await Promise.all([getExtraPools(ctx, poolManager), getExtraVaults(ctx, vaultManager)])

  poolManager.pools = pools

  return {
    contracts: { poolManager, vaultManager, pools, locker, vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    poolManager: getExtraPoolsBalances,
    locker: (...args) => getSingleLockerBalance(...args, EXTRA, 'lockedBalances'),
  })

  return {
    groups: [{ balances }],
  }
}
