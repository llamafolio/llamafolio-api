import { getBPDPendingRewards } from '@adapters/big-data-protocol/ethereum/masterChef'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const BDP: Contract = {
  chain: 'ethereum',
  address: '0xf3dcbc6D72a4E1892f7917b7C43b74131Df8480e',
  decimals: 18,
  symbol: 'BDP',
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x0De845955E2bF089012F682fE9bC81dD5f11B372',
}

const masterChef_v1: Contract = {
  chain: 'ethereum',
  address: '0xf20084ba368567fa3da1da85b43ac1ac310880c8',
}

const masterChef_v2: Contract = {
  chain: 'ethereum',
  address: '0xf2f8984a5e5ff35c8b52a40b642e1ecfaecf3ba7',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, pools_v1, pools_v2] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef_v1.address }),
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef_v2.address }),
  ])

  return {
    contracts: { pools, pools_v1, pools_v2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: BDP,
        getUserPendingRewards: getBPDPendingRewards,
      }),
    pools_v1: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef_v1.address,
        rewardToken: BDP,
        getUserPendingRewards: getBPDPendingRewards,
      }),
    pools_v2: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef_v2.address,
        rewardToken: BDP,
        getUserPendingRewards: getBPDPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1614902400,
}
