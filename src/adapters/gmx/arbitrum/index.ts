import { Contract, GetBalancesHandler } from '@lib/adapter'

import { getGLPBalances, getGLPContracts, getGLPVesterBalances } from '../common/glp'
import { getGMXBalances, getGMXContracts, getGMXVesterBalances } from '../common/gmx'

const gmxRouter: Contract = {
  name: 'GMX: Reward Router',
  chain: 'arbitrum',
  address: '0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1',
}

export const getContracts = async () => {
  const [gmx, glp] = await Promise.all([getGMXContracts('arbitrum', gmxRouter), getGLPContracts('arbitrum', gmxRouter)])

  return {
    contracts: { gmx, glp },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { gmx, glp }) => {
  const balances = await Promise.all([
    getGMXBalances(ctx, 'arbitrum', gmx || []),
    getGLPBalances(ctx, 'arbitrum', glp || []),
    getGMXVesterBalances(ctx, 'arbitrum', gmx || []),
    getGLPVesterBalances(ctx, 'arbitrum', glp || []),
  ])

  return {
    balances: balances.flat(),
  }
}
