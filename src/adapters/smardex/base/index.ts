import { getUserPendingSDEX } from '@adapters/smardex/common/farm'
import { getSmardexMasterChefPoolsContracts } from '@adapters/smardex/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const SDEX: Contract = {
  chain: 'base',
  address: '0xFd4330b0312fdEEC6d4225075b82E00493FF2e3f',
  decimals: 18,
  symbol: 'SDEX',
}

const masterChef: Contract = {
  chain: 'base',
  address: '0xa5D378c05192E3f1F365D6298921879C4D51c5a3',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getSmardexMasterChefPoolsContracts(ctx, masterChef),
    getPairsContracts({
      ctx,
      factoryAddress: '0xdd4536dD9636564D891c919416880a3e250f975A',
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
        masterChefAddress: masterChef.address,
        rewardToken: SDEX,
        getUserPendingRewards: (...args) => getUserPendingSDEX(...args),
      }),
  })

  return {
    groups: [{ balances }],
  }
}
