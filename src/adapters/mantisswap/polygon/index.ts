import type { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLpBalances, getMantisFarmBalances } from './balance'

const masterChef: Contract = {
  chain: 'polygon',
  address: '0x2c1Ded27522E317515e5B5e856De7293938b6D1E',
}

const pools: Contract[] = [
  {
    chain: 'polygon',
    address: '0xe03aec0d08B3158350a9aB99f6Cea7bA9513B889',
    underlyings: ['0x2791bca1f2de4661ed88a30c99a7a9449aa84174'],
  },
  {
    chain: 'polygon',
    address: '0xe8A1eAD2F4c454e319b76fA3325B754C47Ce1820',
    underlyings: ['0xc2132d05d31c914a87c6611c10748aeb04b58e8f'],
  },
  {
    chain: 'polygon',
    address: '0x4b3BFcaa4F8BD4A276B81C110640dA634723e64B',
    underlyings: ['0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'],
  },
]

export const getContracts = () => {
  return {
    contracts: { pools, masterChef },
    revalidate: 60 * 60,
  }
}

const getMantisBalances = async (ctx: BalancesContext, pools: Contract[], masterChef: Contract) => {
  return Promise.all([getLpBalances(ctx, pools), getMantisFarmBalances(ctx, pools, masterChef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getMantisBalances(...args, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}
