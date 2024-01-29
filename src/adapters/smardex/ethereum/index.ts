import { getUserPendingSDEX } from '@adapters/smardex/common/farm'
import { getSmardexMasterChefPoolsContracts } from '@adapters/smardex/common/pool'
import { getSmarDexStakeBalances } from '@adapters/smardex/ethereum/stake'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xB940D63c2deD1184BbdE059AcC7fEE93654F02bf',
    underlyings: ['0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF'],
    decimals: 18,
    symbol: 'stSDEX',
  },
  {
    chain: 'ethereum',
    address: '0x80497049b005fd236591c3cd431dbd6e06eb1a31',
    underlyings: ['0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF'],
    decimals: 18,
    symbol: 'stSDEX',
  },
]

const SDEX: Contract = {
  chain: 'ethereum',
  address: '0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF',
  decimals: 18,
  symbol: 'SDEX',
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0xe74A7a544534DA80fBaC4d2475a6fDc03388154f',
}

const masterChef2: Contract = {
  chain: 'ethereum',
  address: '0x7d85c0905a6e1ab5837a0b57cd94a419d3a77523',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, pools2, { pairs, allPairsLength }] = await Promise.all([
    getSmardexMasterChefPoolsContracts(ctx, masterChef),
    getSmardexMasterChefPoolsContracts(ctx, masterChef2),
    getPairsContracts({
      ctx,
      factoryAddress: '0x7753F36E711B66a0350a753aba9F5651BAE76A1D',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
      pools,
      pools2,
      pairs,
      stakers,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getSmarDexStakeBalances,
    pairs: getPairsBalances,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: SDEX,
        getUserPendingRewards: (...args) => getUserPendingSDEX(...args),
      }),
    pools2: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef2.address,
        rewardToken: SDEX,
        getUserPendingRewards: (...args) => getUserPendingSDEX(...args),
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1678492800,
}
