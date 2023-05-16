import { getBadgerBalances } from '@adapters/badger-dao/common/farm'
import { getBadgerStakeBalances } from '@adapters/badger-dao/ethereum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBadgerContractsFromAPI } from '../common/contract'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xc4e15973e6ff2a35cc804c2cf9d2a1b817a8b40f',
  decimals: 18,
  symbol: 'ibBTC',
  underlyings: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBadgerContractsFromAPI(ctx)
  return {
    contracts: { pools, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getBadgerBalances,
    staker: getBadgerStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
