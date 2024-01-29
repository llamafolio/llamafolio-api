import type { AdapterConfig } from "@lib/adapter";import { getSushiPoolInfos } from '@adapters/sushiswap/common/contract'
import { getUserPendingSushi } from '@adapters/sushiswap/common/reward'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import type { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const masterChef: Contract = {
  name: 'miniChef',
  displayName: 'MiniChef',
  chain: 'polygon',
  address: '0x0769fd68dfb93167989c6f7254cd0d766fb2841f',
}

const SUSHI: Token = {
  chain: 'polygon',
  address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
  symbol: 'SUSHI',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: masterChef.address,
      getPoolInfos: (...args) => getSushiPoolInfos(...args),
    }),
    getPairsContracts({
      ctx,
      factoryAddress: '0xc35dadb65012ec5796536bd9864ed8773abc74c4',
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

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: SUSHI,
        getUserPendingRewards: (...args) => getUserPendingSushi(...args),
      }),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1614556800,
                  }
                  