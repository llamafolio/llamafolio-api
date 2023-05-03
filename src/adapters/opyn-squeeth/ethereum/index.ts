import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

import { getOpynStakeBalance } from './stake'

const oSQTH: Contract = {
  name: 'Opyn Squeeth',
  chain: 'ethereum',
  address: '0xf1B99e3E573A1a9C5E6B2Ce818b617F0E664E86B',
  decimals: 18,
  symbol: 'oSQTH',
}

const crabStrategy2: Contract = {
  chain: 'ethereum',
  address: '0x3B960E47784150F5a63777201ee2B15253D713e8',
  decimals: 18,
  symbol: 'Crabv2',
  underlyings: [oSQTH],
}

export const getContracts = async () => {
  return {
    contracts: { oSQTH, crabStrategy2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    oSQTH: getSingleStakeBalance,
    crabStrategy2: getOpynStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
