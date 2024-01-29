import { getUserPendingARC } from '@adapters/arc-swap/ethereum/reward'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const ARC: Contract = {
  chain: 'ethereum',
  address: '0xc82e3db60a52cf7529253b4ec688f631aad9e7c2',
  decimals: 18,
  symbol: 'ARC',
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x1575f4b5364ddbd6c9c77d1fe603e2d76432aa6a',
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
        rewardToken: ARC,
        getUserPendingRewards: (...args) => getUserPendingARC(...args),
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1679097600,
}
