import type { AdapterConfig } from "@lib/adapter";import { getUserPendingSDEX } from '@adapters/smardex/common/farm'
import { getSmardexMasterChefPoolsContracts } from '@adapters/smardex/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const SDEX: Contract = {
  chain: 'arbitrum',
  address: '0xabd587f2607542723b17f14d00d99b987c29b074',
  decimals: 18,
  symbol: 'SDEX',
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0x53D165DF0414bD02E91747775450934BF2257f69',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getSmardexMasterChefPoolsContracts(ctx, masterChef),
    getPairsContracts({
      ctx,
      factoryAddress: '0x41A00e3FbE7F479A99bA6822704d9c5dEB611F22',
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
                  