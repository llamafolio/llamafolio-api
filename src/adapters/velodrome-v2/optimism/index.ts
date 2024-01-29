import type { AdapterConfig } from "@lib/adapter";import { getLockerFeesBribesBalances } from '@adapters/velodrome-v2/optimism/locker'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getVelodromeBalances } from './balance'
import { getVelodromePairsContracts } from './pair'

const VELO: Token = {
  chain: 'optimism',
  address: '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db',
  decimals: 18,
  symbol: 'VELO',
}

const factory: Contract = {
  chain: 'optimism',
  address: '0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a',
}

const voter: Contract = {
  chain: 'optimism',
  address: '0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C',
}

const locker: Contract = {
  chain: 'optimism',
  address: '0xfaf8fd17d9840595845582fcb047df13f006787d',
}

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getVelodromePairsContracts(ctx, factory, voter)

  const lockerWithBribesAndFees = { ...locker, pairs }

  return {
    contracts: { pairs, lockerWithBribesAndFees },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getVelodromeBalances(...args, VELO),
    lockerWithBribesAndFees: (...args) => getLockerFeesBribesBalances(...args, VELO),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1687478400,
                  }
                  