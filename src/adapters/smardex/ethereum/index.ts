import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getSmarDexFarmBalances } from './farm'
import { getSmarDexStakeBalances } from './stake'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xB940D63c2deD1184BbdE059AcC7fEE93654F02bf',
  underlyings: ['0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF'],
  decimals: 18,
  symbol: 'stSDEX',
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0xe74A7a544534DA80fBaC4d2475a6fDc03388154f',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x7753F36E711B66a0350a753aba9F5651BAE76A1D',
    offset,
    limit,
  })

  return {
    contracts: {
      masterChef,
      pairs,
      staker,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

const getSmarDexBalances = async (ctx: BalancesContext, pairs: Pair[], masterChef: Contract) => {
  return Promise.all([getPairsBalances(ctx, pairs), getSmarDexFarmBalances(ctx, pairs, masterChef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getSmarDexBalances(...args, masterChef),
    staker: getSmarDexStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
