import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from '../common/balances'
import { getPoolsContracts } from './pools'

const fairLaunch: Contract = {
  name: 'fairlaunchContractAddress',
  chain: 'bsc',
  address: '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F',
}

const alpaca: Contract = {
  chain: 'bsc',
  address: '0x8f0528ce5ef7b51152a59745befdd91d97091d2f',
  decimals: 18,
  symbol: 'ALPACA',
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('bsc', fairLaunch)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'bsc', contracts, {
    pools: (ctx, chain, pools) => getPoolsBalances(ctx, chain, pools, fairLaunch, alpaca),
  })

  return {
    balances,
  }
}
