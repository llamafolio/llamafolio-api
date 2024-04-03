import { getSakePendingRewards } from '@adapters/sakeperp/ethereum/masterchef'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const SAKE: Contract = {
  chain: 'ethereum',
  address: '0x066798d9ef0833ccc719076dab77199ecbd178b0',
  decimals: 18,
  symbol: 'SAKE',
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x0ec1f1573f3a2db0ad396c843e6a079e2a53e557',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 500

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getPairsContracts({
      ctx,
      factoryAddress: '0x75e48C954594d64ef9613AeEF97Ad85370F13807',
      offset,
      limit,
    }),
  ])

  return {
    contracts: { pairs, pools },
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
        rewardToken: SAKE,
        getUserPendingRewards: getSakePendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1617235200,
}
