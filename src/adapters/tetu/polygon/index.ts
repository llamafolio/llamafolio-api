import { getTetuVaultBalances } from '@adapters/tetu/common/farm'
import { getTetuLpBalances } from '@adapters/tetu/common/lp'
import { getTetuPools } from '@adapters/tetu/common/pool'
import { getTetuVaults } from '@adapters/tetu/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const URL = 'https://api.thegraph.com/subgraphs/name/tetu-io/tetu-swap'

const factory: Contract = {
  chain: 'polygon',
  address: '0x0A0846c978a56D6ea9D2602eeb8f977B21F3207F',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, vaults] = await Promise.all([getTetuPools(ctx, URL), getTetuVaults(ctx, factory)])

  return {
    contracts: { pools, vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getTetuLpBalances,
    vaults: getTetuVaultBalances,
  })

  return {
    groups: [{ balances }],
  }
}
