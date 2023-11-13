import { getSushiPoolInfos } from '@adapters/sushiswap/common/contract'
import { getUserPendingSushi } from '@adapters/sushiswap/common/reward'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import type { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'masterChef',
  chain: 'arbitrum',
  address: '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3',
}

const SUSHI: Token = {
  chain: 'arbitrum',
  address: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
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
