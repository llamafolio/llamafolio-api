import type { AdapterConfig } from "@lib/adapter";import { getFortLockerBalances } from '@adapters/citadelswap/base/locker'
import { getUserPendingFORT } from '@adapters/citadelswap/base/reward'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const locker: Contract = {
  chain: 'base',
  address: '0x84f1702a894515ea741cf80ecff129b936867df6',
  token: '0x7233062d88133b5402d39d62bfa23a1b6c8d0898',
}

const FORT: Contract = {
  chain: 'base',
  address: '0x7233062d88133b5402d39d62bfa23a1b6c8d0898',
  decimals: 18,
  symbol: 'FORT',
}

const masterChef: Contract = {
  chain: 'base',
  address: '0x75776c547d312eba17c9461fd5c10ba6c2f85237',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getPairsContracts({
      ctx,
      factoryAddress: '0xbe720274c24b5ec773559b8c7e28c2503dac7645',
      offset,
      limit,
    }),
  ])

  return {
    contracts: { pairs, pools, locker },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    locker: getFortLockerBalances,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: FORT,
        getUserPendingRewards: getUserPendingFORT,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1700611200,
                  }
                  