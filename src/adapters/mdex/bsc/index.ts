import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances, getMasterChefPoolsContracts } from '@lib/masterchef/newMasterchef'
import type { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const MDX: Token = {
  chain: 'bsc',
  address: '0x9c65ab58d8d978db963e63f2bfb7121627e3a739',
  symbol: 'MDX',
  decimals: 18,
}

const masterChef: Contract = {
  chain: 'bsc',
  address: '0xc48fe252aa631017df253578b1405ea399728a50',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 1000

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getPairsContracts({
      ctx,
      factoryAddress: '0x3CD1C46068dAEa5Ebb0d3f55F6915B10648062B8',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
      pools,
      pairs,
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
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: '0xc48fe252aa631017df253578b1405ea399728a50',
        rewardToken: MDX,
      }),
  })

  return {
    groups: [{ balances }],
  }
}
