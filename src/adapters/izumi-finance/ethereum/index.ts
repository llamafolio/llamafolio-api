import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLockerIzumiBalances } from './locker'

const nftlocker: Contract = {
  chain: 'ethereum',
  address: '0xb56a454d8dac2ad4cb82337887717a2a427fcd00',
  decimals: 18,
  symbol: 'veIZI',
}

export const getContracts = async (ctx: BaseContext) => {
  return {
    contracts: { nftlocker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    nftlocker: getLockerIzumiBalances,
  })

  return {
    groups: [{ balances }],
  }
}
