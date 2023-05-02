import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getSwellBalances } from './balance'

const swETH: Contract = {
  chain: 'ethereum',
  address: '0xf951e335afb289353dc249e82926178eac7ded78',
  decimals: 18,
  symbol: 'swETH',
}

export const getContracts = () => {
  return {
    contracts: { swETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    swETH: getSwellBalances,
  })

  return {
    groups: [{ balances }],
  }
}
