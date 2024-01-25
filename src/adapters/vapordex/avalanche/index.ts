import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const staker: Contract = {
  chain: 'avalanche',
  address: '0xae950fdd0cc79dde64d3fffd40fabec3f7ba368b',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 1000

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xc009a670e2b02e21e7e75ae98e254f467f7ae257',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      staker,
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
    staker: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
