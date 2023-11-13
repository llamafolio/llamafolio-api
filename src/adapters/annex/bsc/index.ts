import { getAnnexV1Rewards, getAnnexV2Rewards } from '@adapters/annex/bsc/balance'
import { getAnnexContracts } from '@adapters/annex/bsc/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'

const ANN: Contract = {
  chain: 'bsc',
  address: '0x98936bde1cf1bff1e7a8012cee5e2583851f2067',
  decimals: 18,
  symbol: 'ANN',
}

const BUSD: Contract = {
  chain: 'bsc',
  address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  decimals: 18,
  symbol: 'BUSD',
}

const comptroller: Contract = {
  chain: 'bsc',
  address: '0xb13026db8aafa2fd6d23355533dccccbd4442f4c',
}

const masterchef: Contract = {
  chain: 'bsc',
  address: '0x9c821500eaba9f9737fdaadf7984dff03edc74d1',
}

const masterchefv2: Contract = {
  chain: 'bsc',
  address: '0x95660cc9fdf5e55c579101f5867b89f24f254ea1',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, { pools, poolsv2 }] = await Promise.all([
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // cBNB -> wBNB
        '0xc5a83ad9f3586e143d2c718e8999206887ef9ddc': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      },
    }),
    getAnnexContracts(ctx, [masterchef, masterchefv2]),
  ])

  return {
    contracts: { markets, pools, poolsv2 },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterchef.address,
        rewardToken: ANN,
        getUserPendingRewards: (...args) => getAnnexV1Rewards(...args),
      }),
    poolsv2: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterchefv2.address,
        rewardToken: BUSD,
        getUserPendingRewards: (...args) => getAnnexV2Rewards(...args),
      }),
  })

  return {
    groups: [{ balances }],
  }
}
