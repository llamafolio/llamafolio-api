import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGLPStakerBalance, getGLPVesterBalance, getGMXStakerBalances, getGMXVesterBalance } from '../common/balances'
import { getGMXContracts } from '../common/contracts'

const gmxRouter: Contract = {
  name: 'GMX: Reward Router',
  chain: 'arbitrum',
  address: '0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1',
}

const vault: Contract = {
  name: 'Vault',
  chain: 'arbitrum',
  address: '0x489ee077994B6658eAfA855C308275EAd8097C4A',
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
