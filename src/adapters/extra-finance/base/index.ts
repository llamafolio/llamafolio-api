import type { AdapterConfig } from "@lib/adapter";import { getExtraPoolsBalances } from '@adapters/extra-finance/common/balance'
import { getExtraPools } from '@adapters/extra-finance/common/pool'
import { getExtraVaults } from '@adapters/extra-finance/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolManager: Contract = {
  chain: 'base',
  address: '0xbb505c54d71e9e599cb8435b4f0ceec05fc71cbd',
}

const vaultManager: Contract = {
  chain: 'base',
  address: '0xf9cfb8a62f50e10adde5aa888b44cf01c5957055',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, vaults] = await Promise.all([getExtraPools(ctx, poolManager), getExtraVaults(ctx, vaultManager)])

  poolManager.pools = pools

  return {
    contracts: { poolManager, vaultManager, vaults, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    poolManager: getExtraPoolsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1693785600,
                  }
                  