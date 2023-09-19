// https://docs.equalizer.exchange/overview/contract-addresses/

import { getSolidlyBalances } from '@adapters/solidly-v2/ethereum/balance'
import { getThenaContracts } from '@adapters/thena/bsc/pair'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

const EQUAL: Token = {
  chain: 'fantom',
  address: '0x3fd3a0c85b70754efc07ac9ac0cbbdce664865a6',
  name: 'Equalizer DEX',
  symbol: 'EQUAL',
  decimals: 18,
  coingeckoId: 'equalizer-dex',
}

const voter: Contract = {
  chain: 'fantom',
  address: '0xe3d1a117df7dcac2eb0ac8219341bad92f18dac1',
}

const locker: Contract = {
  chain: 'fantom',
  address: '0x8313f3551c4d3984ffbadfb42f780d0c8763ce94',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getThenaContracts(ctx, voter)

  return {
    contracts: { pools, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSolidlyBalances(...args, EQUAL),
    locker: (...args) => getNFTLockerBalances(...args, EQUAL, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
