import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getSwellBalances } from './balance'

const swETH: Contract = {
  chain: 'ethereum',
  address: '0xf951e335afb289353dc249e82926178eac7ded78',
  decimals: 18,
  symbol: 'swETH',
}

const rswETH: Contract = {
  chain: 'ethereum',
  address: '0xfae103dc9cf190ed75350761e95403b7b8afa6c0',
  decimals: 18,
  symbol: 'rswETH',
}

export const getContracts = () => {
  return {
    contracts: { LSTs: [swETH, rswETH] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    LSTs: getSwellBalances,
  })

  return {
    groups: [{ balances }],
  }
}
