import {
  getARBSPendingRewards,
  getARBSResolvedUnderlyings,
  getArbSwapUnderlyings,
} from '@adapters/arbswap/arbitrum/masterChef'
import { getStablePairsBalances, getStablePairsContracts } from '@adapters/arbswap/arbitrum/pair'
import { getArbsStakeBalance } from '@adapters/arbswap/arbitrum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const ARBS: Contract = {
  chain: 'arbitrum',
  address: '0xf50874f8246776ca4b89eef471e718f70f38458f',
  decimals: 18,
  symbol: 'ARBS',
}

const xARBS: Contract = {
  chain: 'arbitrum',
  address: '0xa04c348246efb67e5376da989d70175145089d36',
  underlyings: ['0xf50874f8246776ca4b89eef471e718f70f38458f'],
}

const factoryAddress = '0x3a52e9200Ed7403D9d21664fDee540C2d02c099d'

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0x41210a7C9853Da7A65cAd516c32c25fA5c7eB0b0',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, stablePairs, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address, getUnderlyings: getArbSwapUnderlyings }),
    getStablePairsContracts(ctx, factoryAddress),
    getPairsContracts({
      ctx,
      factoryAddress: '0xd394e9cc20f43d2651293756f8d320668e850f1b',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
      pools,
      pairs,
      stablePairs,
      xARBS,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    stablePairs: getStablePairsBalances,
    xARBS: getArbsStakeBalance,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: ARBS,
        getResolvedUnderlyings: getARBSResolvedUnderlyings,
        getUserPendingRewards: getARBSPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}
