import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLockerBalance, getPoolsBalances } from '../common/balances'
import { getPoolsContracts } from './pools'

const fairLaunch: Contract = {
  name: 'fairlaunchContractAddress',
  chain: 'bsc',
  address: '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F',
}

const ALPACA: Contract = {
  chain: 'bsc',
  address: '0x8f0528ce5ef7b51152a59745befdd91d97091d2f',
  decimals: 18,
  symbol: 'ALPACA',
}

const xALPACA: Contract = {
  chain: 'bsc',
  address: '0xb7d85ab25b9d478961face285fa3d8aaecad24a9',
  decimals: 18,
  symbol: 'xALPACA',
  underlyings: [ALPACA],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, fairLaunch)

  return {
    contracts: { pools, xALPACA },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (ctx, pools) => getPoolsBalances(ctx, pools, fairLaunch, ALPACA),
    xALPACA: getLockerBalance,
  })

  return {
    balances,
  }
}
