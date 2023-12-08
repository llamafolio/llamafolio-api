import { getTetuVaultBalances } from '@adapters/tetu/common/farm'
import { getTetuLpBalances } from '@adapters/tetu/common/lp'
import { getTetuPools } from '@adapters/tetu/common/pool'
import { getTetuVaults } from '@adapters/tetu/common/vault'
import { getTetuLockerBalances } from '@adapters/tetu/polygon/locker'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'polygon',
  address: '0x6fb29dd17fa6e27bd112bc3a2d0b8dae597aeda4',
  token: '0xE2f706EF1f7240b803AAe877C9C762644bb808d8',
  poolId: '0xe2f706ef1f7240b803aae877c9c762644bb808d80002000000000000000008c2',
  underlyings: ['0x255707b70bf90aa112006e1b07b9aea6de021424', '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'],
}

const URL = 'https://api.thegraph.com/subgraphs/name/tetu-io/tetu-swap'

const factory: Contract = {
  chain: 'polygon',
  address: '0x0A0846c978a56D6ea9D2602eeb8f977B21F3207F',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, vaults] = await Promise.all([getTetuPools(ctx, URL), getTetuVaults(ctx, factory)])

  return {
    contracts: { pools, vaults, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getTetuLpBalances,
    vaults: getTetuVaultBalances,
    locker: getTetuLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
