import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getStakeBalances, getUniqueUnderlyingsMasterchefBalances } from './balance'

const BSW: Token = {
  chain: 'bsc',
  address: '0x965f527d9159dce6288a2219db51fc6eef120dd1',
  decimals: 18,
  symbol: 'BSW',
}

const bswStaker: Contract = {
  name: 'AutoBSW',
  chain: 'bsc',
  address: '0x97A16ff6Fd63A46bf973671762a39f3780Cda73D',
  underlyings: [BSW],
}

const bswStaker2: Contract = {
  name: 'Holder Pool AutoBSW',
  chain: 'bsc',
  address: '0xa4b20183039b2F9881621C3A03732fBF0bfdff10',
  underlyings: [BSW],
}

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'bsc',
  address: '0xDbc1A13490deeF9c3C12b44FE77b503c1B061739',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      masterChef,
      stakers: [bswStaker, bswStaker2],
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getBiswapPairsBalances(
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
    getUniqueUnderlyingsMasterchefBalances(ctx, masterchef),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getBiswapPairsBalances(...args, masterChef, BSW, 'BSW'),
    stakers: getStakeBalances,
  })

  return {
    balances,
  }
}
