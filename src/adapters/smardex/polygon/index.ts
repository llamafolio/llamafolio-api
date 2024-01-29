import { getUserPendingSDEX } from '@adapters/smardex/common/farm'
import { getSmardexMasterChefPoolsContracts } from '@adapters/smardex/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const SDEX: Contract = {
  chain: 'polygon',
  address: '0x6899fAcE15c14348E1759371049ab64A3a06bFA6',
  decimals: 18,
  symbol: 'SDEX',
}

const masterChef: Contract = {
  chain: 'polygon',
  address: '0x7DB73A1e526db36c40e508b09428420c1fA8e46b',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getSmardexMasterChefPoolsContracts(ctx, masterChef),
    getPairsContracts({
      ctx,
      factoryAddress: '0x9A1e1681f6D59Ca051776410465AfAda6384398f',
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

export const config: AdapterConfig = {
  startDate: 1689984000,
}
