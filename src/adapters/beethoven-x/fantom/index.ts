import type { AdapterConfig } from "@lib/adapter";import { getReliquaryBalances, getReliquaryContracts } from '@adapters/beethoven-x/common/fBeets'
import {
  getBeethovenLpBalances,
  getBeethovenPools,
  getBeethovenPoolsInfos,
  getBeethovenUnderlyings,
  getBeethovenUnderlyingsBalances,
  getUserPendingBEETS,
} from '@adapters/beethoven-x/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const url = 'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx'

const reliquary: Contract = {
  chain: 'fantom',
  address: '0x1ed6411670c709f4e163854654bd52c74e66d7ec',
}

const BEETS: Contract = {
  chain: 'fantom',
  address: '0xf24bcf4d1e507740041c9cfd2dddb29585adce1e',
  decimals: 18,
  symbol: 'BEETS',
}

const vault: Contract = {
  chain: 'fantom',
  address: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
}

const masterChef: Contract = {
  chain: 'fantom',
  address: '0x8166994d9ebbe5829ec86bd81258149b87facfd3',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pairs, fBeetsContracts, pools] = await Promise.all([
    getBeethovenPools(ctx, url),
    getReliquaryContracts(ctx, reliquary),
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: masterChef.address,
      getPoolInfos: getBeethovenPoolsInfos,
      getUnderlyings: getBeethovenUnderlyings,
    }),
  ])

  return {
    contracts: { pairs, pools, fBeetsContracts },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getBeethovenLpBalances(...args, vault),
    fBeetsContracts: (...args) => getReliquaryBalances(...args, reliquary, vault),
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: BEETS,
        getUserPendingRewards: (...args) => getUserPendingBEETS(...args),
        getResolvedUnderlyings: getBeethovenUnderlyingsBalances,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1633737600,
                  }
                  