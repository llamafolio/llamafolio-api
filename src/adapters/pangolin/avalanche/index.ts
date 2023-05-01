import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getPangolinStakeBalances } from './balance'

const pangolin: Token = {
  chain: 'avalanche',
  address: '0x60781c2586d68229fde47564546784ab3faca982',
  decimals: 18,
  symbol: 'PNG',
}

const staker: Contract = {
  name: 'PNG staking',
  chain: 'avalanche',
  address: '0x88afdaE1a9F58Da3E68584421937E5F564A0135b',
  underlyings: [pangolin],
  rewards: [pangolin],
}

const miniChef: Contract = {
  chain: 'avalanche',
  address: '0x1f806f7C8dED893fd3caE279191ad7Aa3798E928',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xefa94de7a4656d787667c749f7e1223d71e9fd88',
    offset,
    limit,
  })

  return {
    contracts: { staker, miniChef, pairs },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getPangolinPairsBalances(
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
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getPangolinPairsBalances(...args, miniChef, pangolin, 'Reward', true),
    staker: getPangolinStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
