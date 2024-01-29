import { getUserPendingSDEX } from '@adapters/smardex/common/farm'
import { getSmardexMasterChefPoolsContracts } from '@adapters/smardex/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const SDEX: Contract = {
  chain: 'bsc',
  address: '0xFdc66A08B0d0Dc44c17bbd471B88f49F50CdD20F',
  decimals: 18,
  symbol: 'SDEX',
}

const masterChef: Contract = {
  chain: 'bsc',
  address: '0xb891Aeb2130805171796644a2af76Fc7Ff25a0b9',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getSmardexMasterChefPoolsContracts(ctx, masterChef),
    getPairsContracts({
      ctx,
      factoryAddress: '0xA8EF6FEa013034E62E2C4A9Ec1CDb059fE23Af33',
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
