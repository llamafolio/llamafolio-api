import { getConvexAltChainsBalances } from '@adapters/convex-finance/common/balance'
import { getConvexAltChainsPools } from '@adapters/convex-finance/common/pool'
import { getPoolsContracts } from '@adapters/curve-dex/common/pools'
import { getRegistries } from '@adapters/curve-dex/common/registries'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const booster: Contract = {
  name: 'Convex Finance Booster',
  chain: 'arbitrum',
  address: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
  rewards: ['0x11cdb42b0eb46d95f990bedd4695a6e3fa034978', '0xb952a807345991bd529fdded05009f5e80fe8f45'],
}

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap', 'cryptoFactory'])
  const pools = await getPoolsContracts(ctx, registries)
  const cvxPools = await getConvexAltChainsPools(ctx, booster, pools)

  console.log(cvxPools)

  return {
    contracts: { cvxPools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    cvxPools: getConvexAltChainsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
