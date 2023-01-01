import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGLPStakerBalance, getGLPVesterBalance, getGMXStakerBalances, getGMXVesterBalance } from '../common/balances'
import { getGMXContracts } from '../common/contracts'

const gmxRouter: Contract = {
  name: 'GMX: Reward Router',
  chain: 'avax',
  address: '0x82147C5A7E850eA4E28155DF107F2590fD4ba327',
}

export const getContracts = async () => {
  const contracts = await getGMXContracts('avax', gmxRouter)

  return {
    contracts,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    gmxVester: getGMXVesterBalance,
    gmxStaker: getGMXStakerBalances,
    glpStaker: getGLPStakerBalance,
    glpVester: getGLPVesterBalance,
  })

  return {
    balances: balances,
  }
}
