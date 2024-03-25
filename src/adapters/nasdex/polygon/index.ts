import { getNasdexPendingRewards } from '@adapters/nasdex/polygon/masterchef'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x35cA0e02C4c16c94c4cC8B67D13d660b78414f95',
}

const NSDX: Contract = {
  chain: 'ethereum',
  address: '0x35cA0e02C4c16c94c4cC8B67D13d660b78414f95',
  decimals: 18,
  symbol: 'NSDX',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address })

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: NSDX,
        getUserPendingRewards: getNasdexPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1635379200,
}
