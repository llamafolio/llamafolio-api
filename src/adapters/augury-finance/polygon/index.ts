import { getOmenPendingRewards } from '@adapters/augury-finance/polygon/masterchef'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const OMEN: Contract = {
  chain: 'polygon',
  address: '0x76e63a3e7ba1e2e61d3da86a87479f983de89a7e',
  symbol: 'OMEN',
  decimals: 18,
}

const masterChef: Contract = {
  chain: 'polygon',
  address: '0x6ad70613d14c34aa69E1604af91c39e0591a132e',
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
        rewardToken: OMEN,
        getUserPendingRewards: getOmenPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1628899200,
}
