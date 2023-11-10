import { getUserPendingBananaV1, getUserPendingBananaV2 } from '@adapters/apeswap-amm/bsc/reward'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const BANANA: Contract = {
  chain: 'bsc',
  address: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95',
  decimals: 18,
  symbol: 'BANANA',
}

const masterApe: Contract = {
  chain: 'bsc',
  address: '0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9',
}

const masterApeV2: Contract = {
  chain: 'bsc',
  address: '0x71354ac3c695dfb1d3f595afa5d4364e9e06339b',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, poolsV2, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterApe.address }),
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterApeV2.address }),
    getPairsContracts({
      ctx,
      factoryAddress: '0x0841bd0b734e4f5853f0dd8d7ea041c241fb0da6',
      offset,
      limit,
    }),
  ])

  return {
    contracts: { pools, pairs, poolsV2 },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterApe.address,
        rewardToken: BANANA,
        getUserPendingRewards: (...args) => getUserPendingBananaV1(...args),
      }),
    poolsV2: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterApeV2.address,
        rewardToken: BANANA,
        getUserPendingRewards: (...args) => getUserPendingBananaV2(...args),
      }),
  })

  return {
    groups: [{ balances }],
  }
}
