import { getAlienFarmBalances } from '@adapters/alien-base/base/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const masterChef: Contract = {
  chain: 'base',
  address: '0x52eaecac2402633d98b95213d0b473e069d86590',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getPairsContracts({
      ctx,
      factoryAddress: '0x3e84d913803b02a4a7f027165e8ca42c14c0fde7',
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
    pools: (...args) => getAlienFarmBalances(...args, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}
