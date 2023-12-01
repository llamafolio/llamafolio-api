import { getKokonutBalances, getKokonutPools } from '@adapters/kokonut-swap/base/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const factory: Contract = {
  chain: 'base',
  address: '0x03173f638b3046e463ab6966107534f56e82e1f3',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getKokonutPools(ctx, factory),
    getPairsContracts({
      ctx,
      factoryAddress: '0x4Cf1284dcf30345232D5BfD8a8AAd6734b6941c4',
      offset,
      limit,
    }),
  ])

  return {
    contracts: { pairs, pools },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pools: (...args) => getKokonutBalances(...args, factory),
  })

  return {
    groups: [{ balances }],
  }
}
