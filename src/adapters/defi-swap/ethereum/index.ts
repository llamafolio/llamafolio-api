import type { AdapterConfig } from "@lib/adapter";import { getDefiStakers, getDefiStakersBalances } from '@adapters/defi-swap/ethereum/stake'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const stakerAddresses: `0x${string}`[] = [
  '0x4f2bc163c8758d7f88771496f7b0afde767045f3',
  '0x6aba3e56aeb3b95ad64161103d793fac5f6ce4f7',
  '0x0a3c6eec8408bded9000da65afdb8a8fda99e253',
  '0x26388d599a677c6a8bcc4c113f0a34e6ced9493d',
  '0xb5d32babe28229071bd143b82bd98c690f6f22c6',
]

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 1000

  const [stakers, { pairs, allPairsLength }] = await Promise.all([
    getDefiStakers(ctx, stakerAddresses),
    getPairsContracts({
      ctx,
      factoryAddress: '0x9deb29c9a4c7a88a3c0257393b7f3335338d9a9d',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
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
    pairs: getPairsBalances,
    stakers: getDefiStakersBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1616194800,
                  }
                  