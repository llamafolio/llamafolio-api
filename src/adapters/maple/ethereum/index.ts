import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFarmContracts } from './contract'
import { getMapleFarmBalances } from './farm'
import { getMapleSingleStakeBalances, getMapleStakeBalances } from './stake'

const farmers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xfff9a1caf78b2e5b0a49355a8637ea78b43fb6c3',
    underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 '],
  },
  {
    chain: 'ethereum',
    address: '0xe9d33286f0e37f517b1204aa6da085564414996d',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0xd3cd37a7299b963bbc69592e5ba933388f70dc88',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0x00e0c1ea2085e30e5233e98cfa940ca8cbb1b0b7',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0x79400a2c9a5e2431419cac98bf46893c86e8bdd7',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
]

const staker: Contract = {
  chain: 'ethereum',
  address: '0x4937a209d4cdbd3ecd48857277cfd4da4d82914c',
  underlyings: ['0x33349B282065b0284d756F0577FB39c158F935e6'],
}

const MapleFactory: Contract = {
  chain: 'ethereum',
  name: 'PoolFactory',
  address: '0x2Cd79F7f8b38B9c0D80EA6B230441841A31537eC',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getFarmContracts(ctx, MapleFactory)

  return {
    contracts: { pools, staker, farmers },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getMapleStakeBalances,
    staker: getMapleSingleStakeBalances,
    farmers: getMapleFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1623628800,
}
