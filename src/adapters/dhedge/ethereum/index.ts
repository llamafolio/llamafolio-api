import { getdHedgeBalances } from '@adapters/dhedge/ethereum/balance'
import { getdHedgePools } from '@adapters/dhedge/ethereum/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'

const sUSD: Contract = {
  chain: 'ethereum',
  address: '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
  decimals: 18,
  symbol: 'sUSD',
}

const DHT: Contract = {
  chain: 'ethereum',
  address: '0xca1207647Ff814039530D7d35df0e1Dd2e91Fa84',
  decimals: 18,
  symbol: 'DHT',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xee1b6b93733ee8ba77f558f8a87480349bd81f7f',
}

const factory: Contract = {
  chain: 'ethereum',
  address: '0x03d20ef9bdc19736f5e8baf92d02c8661a5941f7',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getdHedgePools(ctx, factory, sUSD)

  return {
    contracts: { pools, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getdHedgeBalances,
    locker: (...args) => getSingleLockerBalance(...args, DHT, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
