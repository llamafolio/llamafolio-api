import { getGloriPendingRewards } from '@adapters/glori-finance/arbitrum/masterChef'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const GLORI: Contract = {
  chain: 'arbitrum',
  address: '0xDF74D76e25FAB06c2CdbA4ebb0e6c82823378bD4',
  decimals: 18,
  symbol: 'GLORI',
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0xcc0f161f84b4a1bddf03bfc41c0ffbef82f30022',
}

const comptroller: Contract = {
  chain: 'polygon',
  address: '0xe0aedc2a4126fad95a53039330c4dd15b63fa8c6',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, markets] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // // cETH -> ETH
        '0xb377358f82b869f21d917bf50a2732ee5c619920': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      },
    }),
  ])

  return {
    contracts: { markets, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: GLORI,
        getUserPendingRewards: getGloriPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}
