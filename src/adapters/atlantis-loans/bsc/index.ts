import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'
import { Token } from '@lib/token'

import { getAtlantisFarmBalances } from '../common/farm'

const atl: Token = {
  chain: 'bsc',
  address: '0x1fd991fb6c3102873ba68a4e6e6a87b3a5c10271',
  decimals: 18,
  symbol: 'ATL',
}

const busd: Token = {
  chain: 'bsc',
  address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  decimals: 18,
  symbol: 'BUSD',
}

const atlStaker: Contract = {
  chain: 'bsc',
  address: '0x9afc9877b1621e414e907f13a8d3ed9511be03de',
  underlyings: [atl],
}

const lpStaker: Contract = {
  chain: 'bsc',
  address: '0xC7A5Bb6FCd603309D7a010de44dcBDe26fD45B58',
  lpToken: { address: '0xaa40dc3ec6ad76db3254b54443c4531e3dfe6bdb', symbol: 'Cake-LP' },
  underlyings: [atl, busd],
}

const Comptroller: Contract = {
  chain: 'bsc',
  address: '0xE7E304F136c054Ee71199Efa6E26E8b0DAe242F3',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // aBNB -> WBNB
      '0x5a9a90983a369b6bb8f062f0afe6219ac01caf63': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    },
  })

  return {
    contracts: { markets, Comptroller, stakers: [atlStaker, lpStaker] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    stakers: (...args) => getAtlantisFarmBalances(...args, atl),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
