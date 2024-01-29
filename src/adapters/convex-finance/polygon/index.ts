import { getConvexAltChainsBalances } from '@adapters/convex-finance/common/balance'
import { getConvexAltChainsPools } from '@adapters/convex-finance/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const booster: Contract = {
  name: 'Convex Finance Booster',
  chain: 'polygon',
  address: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
  rewards: ['0x172370d5cd63279efa6d502dab29171933a610af', '0x4257ea7637c355f81616050cbb6a9b709fd72683'],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getConvexAltChainsPools(ctx, booster)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getConvexAltChainsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1678406400,
}
