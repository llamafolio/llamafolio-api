import { getGammaSwapPoolBalances, getGammaSwapPools } from '@adapters/gammaswap/arbitrum/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const factories: `0x${string}`[] = [
  '0xe048cce443e787c5b6fa886236de2981d54e244f',
  '0xfd513630f697a9c1731f196185fb9eba6eaac20b',
]

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 1000

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getGammaSwapPools(ctx, factories),
    getPairsContracts({
      ctx,
      factoryAddress: '0xcb85e1222f715a81b8edaeb73b28182fa37cffa8',
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
    pools: getGammaSwapPoolBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1695945600,
}
