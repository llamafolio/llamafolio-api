import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getQuickswapBalances } from './stake'

const stakers: Contract[] = [
  {
    chain: 'polygon',
    address: '0x958d208Cdf087843e9AD98d23823d32E17d723A1',
    decimals: 18,
    symbol: 'dQUICK',
    underlyings: ['0xb5c064f955d8e7f38fe0460c556a72987494ee17'],
  },
  {
    chain: 'polygon',
    address: '0xf28164a485b0b2c90639e47b0f377b4a438a16b1',
    decimals: 18,
    symbol: 'dQUICK',
    underlyings: ['0x831753DD7087CaC61aB5644b308642cc1c33Dc13'],
  },
]

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    offset,
    limit,
  })

  return {
    contracts: { pairs, stakers },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    stakers: getQuickswapBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1602194400,
                  }
                  