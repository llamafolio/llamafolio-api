import { getPoolsContracts } from '@adapters/curve-dex/common/pool'
import { getRegistries } from '@adapters/curve-dex/common/registries'
import { getYearnBalances } from '@adapters/yearn-finance/common/balance'
import { getYearnOptimisticVault } from '@adapters/yearn-finance/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const registryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'optimism',
  address: '0xBcfCA75fF12E2C1bB404c2C216DBF901BE047690',
}

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts(ctx, registries)
  const vaults = await getYearnOptimisticVault(ctx, registryAdapter, pools)

  return {
    contracts: { vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getYearnBalances,
  })

  return {
    groups: [{ balances }],
  }
}
