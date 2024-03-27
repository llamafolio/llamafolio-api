import { getOpenXStakeBalance } from '@adapters/openxswap/optimism/balance'
import { getOpenXPendingRewards } from '@adapters/openxswap/optimism/masterChef'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const openX: Contract = {
  chain: 'optimism',
  address: '0xc3864f98f2a61A7cAeb95b039D031b4E2f55e0e9',
  decimals: 18,
  symbol: 'openX',
}

const xOpenX: Contract = {
  chain: 'optimism',
  address: '0x2513486f18eee1498d7b6281f668b955181dd0d9',
  underlyings: ['0xc3864f98f2a61A7cAeb95b039D031b4E2f55e0e9'],
}

const masterChef: Contract = {
  chain: 'optimism',
  address: '0x237aeF9e106f35406ba435d865Ab151E2bA82d7B',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address }),
    getPairsContracts({
      ctx,
      factoryAddress: '0xf3c7978ddd70b4158b53e897f980093183ca5c52',
      offset,
      limit,
    }),
  ])

  return {
    contracts: { pairs, xOpenX, pools },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    xOpenX: getOpenXStakeBalance,
    pools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: openX,
        getUserPendingRewards: getOpenXPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1663286400,
}
