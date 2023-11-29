import { getPerpFarmBalances, getPerpStakeBalance } from '@adapters/perpetual-protocol/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'

const PERP: Contract = {
  chain: 'optimism',
  address: '0x9e1028f5f1d5ede59748ffcee5532509976840e0',
  decimals: 18,
  symbol: 'PERP',
}

const staker: Contract = {
  chain: 'optimism',
  address: '0xad7b4c162707e0b2b5f6fddbd3f8538a5fba0d60',
  token: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
}

const locker: Contract = {
  chain: 'optimism',
  address: '0xd360b73b19fb20ac874633553fb1007e9fcb2b78',
}

const pools: Contract[] = [
  {
    chain: 'optimism',
    address: '0x83d6675fe072928132c1b98ca3647de2fa9c8d84',
    underlyings: ['0x7f5c764cbc14f9669b88837ca1490cca17c31607'],
  }, // USDC
  {
    chain: 'optimism',
    address: '0xf2c886623309c93b56537c8c4d4321813ef78439',
    underlyings: ['0x4200000000000000000000000000000000000006'],
  }, // ETH
  {
    chain: 'optimism',
    address: '0x0a8c0b205549589feadfb954282fbd187e541d83',
    underlyings: ['0x7f5c764cbc14f9669b88837ca1490cca17c31607'],
  }, // USDC
  {
    chain: 'optimism',
    address: '0xef9d827408c52c0f87278e1068ef652ad7274356',
    underlyings: ['0x4200000000000000000000000000000000000042'],
  }, // OP
  {
    chain: 'optimism',
    address: '0xa825825f3c0e7d0e6413981ad940afd8a8b1b976',
    underlyings: ['0x7f5c764cbc14f9669b88837ca1490cca17c31607'],
  }, // USDC
  {
    chain: 'optimism',
    address: '0x78ef3a1dfb1cee9b62b55a96fc076f2ad09d8b6d',
    underlyings: ['0x68f180fcce6836688e9084f035309e29bf0a2095'],
  }, // BTC
]

export const getContracts = () => {
  return {
    contracts: { staker, locker, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getPerpStakeBalance,
    pools: getPerpFarmBalances,
    locker: (...args) => getSingleLockerBalance(...args, PERP, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
