import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

import { getwsSBStakeBalances } from './stake'
import { getSBVesterBalances } from './vest'

const sSB: Contract = {
  chain: 'avalanche',
  address: '0xe9eb40d52ce4744322204d4a29af63c30f0260a4',
  underlyings: ['0x7d1232b90d3f809a54eeaeebc639c62df8a8942f'],
  decimals: 9,
  symbol: 'sSB',
}

const wsSB: Contract = {
  chain: 'avalanche',
  address: '0x31c4c046efad4b04b823a919cc0bdd0f663c87d4',
  underlyings: ['0x7d1232b90d3f809a54eeaeebc639c62df8a8942f'],
  decimals: 18,
  symbol: 'wsSB',
}

const vesters: Contract[] = [
  {
    chain: 'avalanche',
    address: '0x90a08fdf9f433954930f19e97fe9a1b0bdbf5c5f',
    token: '0x7d1232b90d3f809a54eeaeebc639c62df8a8942f',
    underlyings: ['0x7d1232b90d3f809a54eeaeebc639c62df8a8942f'],
  },
  {
    chain: 'avalanche',
    address: '0x587bc7775f88d9a190aa02d30f7df2c9bb183f5d',
    token: '0x7d1232b90d3f809a54eeaeebc639c62df8a8942f',
    underlyings: ['0x7d1232b90d3f809a54eeaeebc639c62df8a8942f'],
  },
  {
    chain: 'avalanche',
    address: '0x472c18c4079ecb68629f4fba1141172404bfee9c',
    token: '0x7d1232b90d3f809a54eeaeebc639c62df8a8942f',
    underlyings: ['0x7d1232b90d3f809a54eeaeebc639c62df8a8942f'],
  },
  {
    chain: 'avalanche',
    address: '0x288e6d7f4935c1f4d2862715306d4bdf8dea6592',
    token: '0x7d1232b90d3f809a54eeaeebc639c62df8a8942f',
    underlyings: ['0x7d1232b90d3f809a54eeaeebc639c62df8a8942f'],
  },
]

export const getContracts = () => {
  return {
    contracts: { sSB, wsSB, vesters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sSB: getSingleStakeBalance,
    wsSB: getwsSBStakeBalances,
    vesters: getSBVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1636329600,
                  }
                  