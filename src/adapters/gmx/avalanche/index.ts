import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGLPStakerBalance, getGLPVesterBalance, getGMXStakerBalances, getGMXVesterBalance } from '../common/balances'
import { getGMXContracts } from '../common/contracts'

const gmxRouter: Contract = {
  name: 'GMX: Reward Router',
  chain: 'avalanche',
  address: '0x82147C5A7E850eA4E28155DF107F2590fD4ba327',
}

const vault: Contract = {
  name: 'Vault',
  chain: 'avalanche',
  address: '0x9ab2De34A33fB459b538c43f251eB825645e8595',
}

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getGMXContracts(ctx, gmxRouter, vault)

  return {
    contracts,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    gmxVester: getGMXVesterBalance,
    gmxStaker: getGMXStakerBalances,
    glpStaker: (ctx, glpStaker) => getGLPStakerBalance(ctx, glpStaker, vault),
    glpVester: getGLPVesterBalance,
  })

  return {
    groups: [{ balances }],
  }
}
