import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBendBalances } from './balance'
import { getBendDaoLocker } from './locker'
import { getNftBalances, getNftContracts } from './nft'

const veBend: Contract = {
  chain: 'ethereum',
  address: '0xd7e97172c2419566839bf80deea46d22b1b2e06e',
  decimals: 18,
  symbol: 'veBEND',
  underlyings: ['0x0d02755a5700414B26FF040e1dE35D337DF56218'],
}

const bendWeth: Contract = {
  chain: 'ethereum',
  address: '0xeD1840223484483C0cb050E6fC344d1eBF0778a9',
  symbol: 'bendWETH',
  decimals: 18,
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  rewarder: '0x26FC1f11E612366d3367fc0cbFfF9e819da91C8d',
}

const lendPool: Contract = {
  chain: 'ethereum',
  address: '0x70b97A0da65C15dfb0FFA02aEE6FA36e507C2762',
}

const registry: Contract = {
  chain: 'ethereum',
  address: '0x79d922DD382E42A156bC0A354861cDBC4F09110d',
}

const apeStaker: Contract = {
  chain: 'ethereum',
  address: '0xDAFCe4AcC2703A24F29d1321AdAADF5768F54642',
  underlyings: ['0x4d224452801ACEd8B2F0aebE155379bb5D594381'],
}

export const getContracts = async (ctx: BaseContext) => {
  const nfts = await getNftContracts(ctx, registry)

  return {
    contracts: { bendWeth, veBend, registry, nfts, lendPool, apeStaker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    bendWeth: getBendBalances,
    veBend: getBendDaoLocker,
    nfts: (...args) => getNftBalances(...args, lendPool, apeStaker),
  })

  // const sortedBalances = groupContracts(balances)
  // const healthFactor = await getNFTHealthFactor((sortedBalances.nfts as NFTBorrowBalance[]) || [])

  return {
    groups: [{ balances }],
  }
}
