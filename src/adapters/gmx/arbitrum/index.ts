import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain } from '@lib/chains'

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

function gmxBalances(ctx: BaseContext, chain: Chain, contract: Contract) {
  return Promise.all([getGMXBalances(ctx, chain, contract), getGMXVesterBalances(ctx, chain, contract)])
}

function glpBalances(ctx: BaseContext, chain: Chain, contract: Contract) {
  return Promise.all([getGLPBalances(ctx, chain, contract), getGLPVesterBalances(ctx, chain, contract)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'arbitrum', contracts, {
    gmx: gmxBalances,
    glp: glpBalances,
  })

  return {
    balances,
  }
}
