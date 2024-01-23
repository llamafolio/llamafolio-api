import { getSwapBasedPoolBalances } from '@adapters/swapbased/base/balance'
import { getSwapBasedAllPoolLength, getSwapBasedUnderlyings } from '@adapters/swapbased/base/masterChef'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const masterChef: Contract = {
  chain: 'base',
  address: '0x6c908d80261eb0bbb7e9102d5b38e1cea0d25265',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: masterChef.address,
      getAllPoolLength: getSwapBasedAllPoolLength,
      getUnderlyings: getSwapBasedUnderlyings,
    }),
    getPairsContracts({
      ctx,
      factoryAddress: '0x04c9f118d21e8b767d2e50c946f0cc9f6c367300',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
      pairs,
      pools,
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
    pools: (...args) => getSwapBasedPoolBalances(...args, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}
