import { getRealTContracts } from '@adapters/realt/gnosis/contract'
import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'

const lendingPool: Contract = {
  name: 'Pool',
  displayName: 'Pool',
  chain: 'gnosis',
  address: '0x5b8d36de471880ee21936f328aab2383a280cb2a',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, lendingPools] = await Promise.all([getRealTContracts(ctx), getLendingPoolContracts(ctx, lendingPool)])

  return {
    contracts: { pools, lendingPools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: getSingleStakeBalances,
      lendingPools: getLendingPoolBalances,
    }),
    getLendingPoolHealthFactor(ctx, lendingPool),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}
