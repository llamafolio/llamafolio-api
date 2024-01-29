import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getUnstEthFarmBalances } from './balance'

const pools: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x33890b88f98a9d511678954ad8db0510b6953cfc',
    token: '0x0Ae38f7E10A43B5b2fB064B42a2f4514cbA909ef',
    underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    rewards: ['0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48'],
  },
  {
    chain: 'ethereum',
    address: '0xf728db9182e7c3a9dffbd71f9506d04f129ac9c8',
    token: '0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48',
    underlyings: ['0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48'],
    rewards: ['0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48'],
  },
  {
    chain: 'ethereum',
    address: '0x5153b553d8ae3cbbb5ac97f5e4c8e5776d30ee09',
    token: '0xAAF448d30F01b429FB6e7F9AF6A8FF66e694F312',
    underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48'],
    rewards: ['0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48'],
  },
  {
    chain: 'ethereum',
    address: '0x954d5088d88291146ce58270add820e809ff3d7e',
    token: '0x846982C0a47b0e9f4c13F3251ba972Bb8D32a8cA',
    underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    rewards: ['0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48'],
  },
]

export const getContracts = () => {
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getUnstEthFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1676160000,
}
