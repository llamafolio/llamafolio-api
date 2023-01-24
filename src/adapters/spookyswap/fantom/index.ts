import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getStakexBOOBalances } from './balance'

const BOO: Token = {
  chain: 'fantom',
  address: '0x841fad6eae12c286d1fd18d1d525dffa75c7effe',
  decimals: 18,
  symbol: 'BOO',
}

const xBOO: Contract = {
  chain: 'fantom',
  address: '0xa48d959AE2E88f1dAA7D5F611E01908106dE7598',
  decimals: 18,
  symbol: 'XBOO',
  underlyings: [BOO],
}

const masterChef: Contract = {
  chain: 'fantom',
  address: '0x18b4f774fdc7bf685daeef66c2990b1ddd9ea6ad',
}
const masterChef2: Contract = {
  chain: 'fantom',
  address: '0x9c9c920e51778c4abf727b8bb223e78132f00aa4',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
    offset,
    limit,
  })

  return {
    contracts: { pairs, masterChef, masterChef2, xBOO },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getSpookyswapPairsBalances(ctx: BalancesContext, pairs: Pair[], masterchef: Contract, rewardToken: Token) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, 'BOO'),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getSpookyswapPairsBalances(...args, masterChef, BOO),
    xBOO: getStakexBOOBalances,
  })

  return {
    balances,
  }
}
