import { BalancesContext, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getStakeBalance } from './balances'

const JOE: Token = {
  chain: 'avax',
  address: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
  symbol: 'JOE',
  decimals: 18,
  coingeckoId: 'joe',
}

const sJOE: Contract = {
  name: 'sJOE staking',
  chain: 'avax',
  address: '0x1a731b2299e22fbac282e7094eda41046343cb51',
  types: 'stake',
}

const veJOE: Contract = {
  name: 'veJOE staking',
  chain: 'avax',
  address: '0x25D85E17dD9e544F6E9F8D44F99602dbF5a97341',
  types: 'stake',
}

const rJOE: Contract = {
  name: 'rJOE staking',
  chain: 'avax',
  address: '0x102D195C3eE8BF8A9A89d63FB3659432d3174d81',
  types: 'stake',
}

const boostedMasterchef: Contract = {
  chain: 'avax',
  address: '0x4483f0b6e2F5486D06958C20f8C39A7aBe87bf8F',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: '0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC',
  })

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
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
    balances: [...balances, ...stakeBalances],
  }
}
