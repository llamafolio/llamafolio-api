import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getRailgunBalances } from '../common/balance'

const railgunStaker: Contract = {
  chain: 'ethereum',
  address: '0xee6a649aa3766bd117e12c161726b693a1b2ee20',
  token: '0xe76C6c83af64e4C60245D8C7dE953DF673a7A33D',
}

export const getContracts = () => {
  return {
    contracts: { railgunStaker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    railgunStaker: getRailgunBalances,
  })

  return {
    groups: [{ balances }],
  }
}
