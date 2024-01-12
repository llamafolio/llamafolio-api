import { getVeYearnBalance, getYearnBalances, getYearnStakeBalance } from '@adapters/yearn-finance/common/balance'
import { getYearnVaults } from '@adapters/yearn-finance/common/vault'
import {
  getYearnFarmClassicBalances,
  getYearnFarmClassicContracts,
  getYearnFarmCurveBalances,
  getYearnFarmCurveContracts,
} from '@adapters/yearn-finance/ethereum/farm'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { getSingleStakeBalance } from '@lib/stake'

const farmersCurveAddresses: `0x${string}`[] = [
  '0x81d93531720d86f0491dee7d03f30b3b5ac24e59',
  '0x7fd8af959b54a677a1d8f92265bd0714274c56a3',
  '0x6130e6cd924a40b24703407f246966d7435d4998',
  '0x28da6de3e804bddf0ad237cfa6048f2930d0b4dc',
  '0x107717c98c8125a94d3d2cc82b86a1b705f3a27c',
]

const farmersClassicAddresses: `0x${string}`[] = [
  '0xe3ee395c9067dd15c492ca950b101a7d6c85b5fc',
  '0x774a55c3eeb79929fd445ae97191228ab39c4d0f',
  '0x84c94d739e075b3c7431bdb1a005f0412df828a5',
  '0x93283184650f4d3b4253abd00978176732118428',
]

const yETH: Contract = {
  chain: 'ethereum',
  address: '0x1bed97cbc3c24a4fb5c069c6e311a967386131f7',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const styETH: Contract = {
  chain: 'ethereum',
  address: '0x583019ff0f430721ada9cfb4fac8f06ca104d0b4',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const veYearn: Contract = {
  chain: 'ethereum',
  address: '0x41B994C192183793bB9cc35bAAb8bD9C6885c6bf',
  token: '0x583019ff0f430721ada9cfb4fac8f06ca104d0b4',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const YFI: Contract = {
  chain: 'ethereum',
  address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
  decimals: 18,
  symbol: 'YFI',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x90c1f9220d90d3966fbee24045edd73e1d588ad5',
  decimals: 18,
  symbol: 'veYFI',
}

export const getContracts = async (ctx: BaseContext) => {
  const [vaults, curveFarmers, classicFarmers] = await Promise.all([
    getYearnVaults(ctx),
    getYearnFarmCurveContracts(ctx, farmersCurveAddresses),
    getYearnFarmClassicContracts(ctx, farmersClassicAddresses),
  ])

  return {
    contracts: { vaults, locker, yETH, styETH, veYearn, curveFarmers, classicFarmers },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: (...args) => getSingleLockerBalance(...args, YFI, 'locked'),
    vaults: getYearnBalances,
    yETH: getSingleStakeBalance,
    styETH: getYearnStakeBalance,
    veYearn: getVeYearnBalance,
    curveFarmers: getYearnFarmCurveBalances,
    classicFarmers: getYearnFarmClassicBalances,
  })

  return {
    groups: [{ balances }],
  }
}
