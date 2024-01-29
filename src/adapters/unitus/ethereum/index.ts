import { getAllUnitusMarkets, getUnitusMarketsInfos } from '@adapters/unitus/common/lend'
import { getUnitusStakers, getUnitusStakersBalances } from '@adapters/unitus/common/staker'
import { getUnitusLockerBalance } from '@adapters/unitus/ethereum/lock'
import { getUnitusEthStakersBalances } from '@adapters/unitus/ethereum/stake'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const stakersAddresses: `0x${string}`[] = ['0x28811dcb2d1755a76678641441b4c9d3ad12be48']

const sDF: Contract = {
  chain: 'ethereum',
  address: '0x41602ccf9b1f63ea1d0ab0f0a1d2f4fd0da53f60',
  token: '0x431ad2ff6a9c365805ebad47ee021148d6f7dbe0',
}

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x8B53Ab2c0Df3230EA327017C91Eb909f815Ad113',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xc0d7f11455aacd225c6fd1be7ddf0bcf93b31cb3',
  token: '0x41602ccf9b1F63ea1d0Ab0F0A1D2F4fd0da53f60',
  underlyings: ['0x431ad2ff6a9c365805ebad47ee021148d6f7dbe0'],
}

export const getContracts = async (ctx: BaseContext) => {
  const [stakers, markets] = await Promise.all([
    getUnitusStakers(ctx, stakersAddresses),
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      getAllMarkets: getAllUnitusMarkets,
      getMarketsInfos: getUnitusMarketsInfos,
    }),
  ])

  return {
    contracts: { markets, sDF, stakers, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    sDF: getUnitusEthStakersBalances,
    stakers: getUnitusStakersBalances,
    locker: getUnitusLockerBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1702944000,
}
