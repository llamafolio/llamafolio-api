import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGLPStakerBalance, getGLPVesterBalance, getGMXStakerBalances, getGMXVesterBalance } from '../common/balances'
import { getGMXContracts } from '../common/contracts'

const gmxRouter: Contract = {
  name: 'GMX: Reward Router',
  chain: 'arbitrum',
  address: '0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1',
}

export const getContracts = async () => {
  const contracts = await getGMXContracts('arbitrum', gmxRouter)

  return {
    contracts,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'arbitrum', contracts, {
    gmxVester: getGMXVesterBalance,
    gmxStaker: getGMXStakerBalances,
    glpStaker: getGLPStakerBalance,
    glpVester: getGLPVesterBalance,
  })

  return {
    balances: balances,
  }
}
