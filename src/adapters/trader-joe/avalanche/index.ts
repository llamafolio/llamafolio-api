import type { BalancesContext, BaseContext, GetBalancesHandler } from '@lib/adapter'
import type { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getStakeBalance } from './balances'

const JOE: Token = {
  chain: 'avalanche',
  address: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
  symbol: 'JOE',
  decimals: 18,
  coingeckoId: 'joe',
}

const sJOE: Contract = {
  name: 'sJOE staking',
  chain: 'avalanche',
  address: '0x1a731b2299e22fbac282e7094eda41046343cb51',
  types: 'stake',
}

const veJOE: Contract = {
  name: 'veJOE staking',
  chain: 'avalanche',
  address: '0x25d85e17dd9e544f6e9f8d44f99602dbf5a97341',
  types: 'stake',
}

const rJOE: Contract = {
  name: 'rJOE staking',
  chain: 'avalanche',
  address: '0x102d195c3ee8bf8a9a89d63fb3659432d3174d81',
  types: 'stake',
}

const boostedMasterchef: Contract = {
  chain: 'avalanche',
  address: '0x4483f0b6e2f5486d06958c20f8c39a7abe87bf8f',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: '0xdc13687554205e5b89ac783db14bb5bba4a1edac',
  })

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x9ad6c38be94206ca50bb0d90783181662f0cfa10',
    offset,
    limit,
  })

  return {
    contracts: {
      markets,
      boostedMasterchef,
      pairs,
      sJOE,
      veJOE,
      rJOE,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getTraderjoePairsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, stakeBalances] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      markets: getMarketsBalances,
      pairs: (...args) => getTraderjoePairsBalances(...args, boostedMasterchef, JOE, 'Tokens', false),
    }),
    getStakeBalance(ctx),
  ])

  return {
    groups: [{ balances: [...balances, ...stakeBalances] }],
  }
}
