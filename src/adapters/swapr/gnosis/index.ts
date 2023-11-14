import { getSwaprBalances } from '@adapters/swapr/common/balance'
import { getSwaprPools } from '@adapters/swapr/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const factory: Contract = {
  chain: 'gnosis',
  address: '0xa039793af0bb060c597362e8155a0327d9b8bee8',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 1000

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getSwaprPools(ctx, factory),
    getPairsContracts({
      ctx,
      factoryAddress: '0x5d48c95adffd4b40c1aaadc4e08fc44117e02179',
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
    pools: getSwaprBalances,
  })

  return {
    groups: [{ balances }],
  }
}
