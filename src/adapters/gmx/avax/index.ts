import { Contract, GetBalancesHandler } from '@lib/adapter'

import { getGLPBalances, getGLPContracts, getGLPVesterBalances } from '../common/glp'
import { getGMXBalances, getGMXContracts, getGMXVesterBalances } from '../common/gmx'

const gmxRouter: Contract = {
  name: 'GMX: Reward Router',
  chain: 'avax',
  address: '0x82147C5A7E850eA4E28155DF107F2590fD4ba327',
}

export const getContracts = async () => {
  const [gmx, glp] = await Promise.all([getGMXContracts('avax', gmxRouter), getGLPContracts('avax', gmxRouter)])

  return {
    contracts: { gmx, glp },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { gmx, glp }) => {
  const balances = await Promise.all([
    getGMXBalances(ctx, 'avax', gmx || []),
    getGLPBalances(ctx, 'avax', glp || []),
    getGMXVesterBalances(ctx, 'avax', gmx || []),
    getGLPVesterBalances(ctx, 'avax', glp || []),
  ])

  return {
    balances: balances.flat(),
  }
}
