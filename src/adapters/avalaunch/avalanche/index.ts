import { getAvalaunchRewards } from '@adapters/avalaunch/avalanche/masterChef'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const XAVA: Contract = {
  chain: 'avalanche',
  address: '0xd1c3f94de7e5b45fa4edbba472491a9f4b166fc4',
  decimals: 18,
  symbol: 'XAVA',
}

const masterChef: Contract = {
  chain: 'avalanche',
  address: '0xa6a01f4b494243d84cf8030d982d7eeb2aecd329',
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
        rewardToken: XAVA,
        getUserPendingRewards: getAvalaunchRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}
