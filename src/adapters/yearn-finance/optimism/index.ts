import { getPoolsContracts } from '@adapters/curve-dex/common/pool'
import { getRegistries } from '@adapters/curve-dex/common/registries'
import { getYearnBalances } from '@adapters/yearn-finance/common/balance'
import { getYearnOptimisticVault } from '@adapters/yearn-finance/common/vault'
import { getOptimisticYearnFarmContracts, getYearnFarmBalances } from '@adapters/yearn-finance/optimism/farm'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const registryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'optimism',
  address: '0xBcfCA75fF12E2C1bB404c2C216DBF901BE047690',
}

const registryFarmer: Contract = {
  chain: 'optimism',
  address: '0x8ED9F6343f057870F1DeF47AaE7CD88dfAA049A8',
}

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts(ctx, registries)

  const [vaults, farmers] = await Promise.all([
    getYearnOptimisticVault(ctx, registryAdapter, pools),
    getOptimisticYearnFarmContracts(ctx, registryFarmer),
  ])

  return {
    contracts: { vaults, farmers },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getYearnBalances,
    farmers: getYearnFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
