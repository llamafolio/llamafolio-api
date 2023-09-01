import { getCVRFarmBalance, getCVRLPFarmBalances } from '@adapters/tangible/polygon/farm'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getTangibleLockerBalances } from './lock'
import { getTangibleStakeBalance } from './stake'

const stakers: Contract[] = [
  {
    // v1
    chain: 'polygon',
    address: '0xaf0d9d65fc54de245cda37af3d18cbec860a4d4b',
    underlyings: ['0xb5dfabd7ff7f83bab83995e72a52b97abb7bcf63'],
    symbol: 'wUSDR',
    decimals: 9,
  },
  {
    // v2
    chain: 'polygon',
    address: '0x00e8c0e92eb3ad88189e7125ec8825edc03ab265',
    underlyings: ['0x40379a439d4f6795b6fc9aa5687db461677a2dba'],
    symbol: 'wUSDR',
    decimals: 9,
  },
]

const CVRfarmer: Contract = {
  // single
  chain: 'polygon',
  address: '0x83c5022745b2511bd199687a42d27befd025a9a9',
  token: '0x6ae96cc93331c19148541d4d2f31363684917092',
  underlyings: undefined,
  rewards: ['0x40379a439d4f6795b6fc9aa5687db461677a2dba'],
}

const CVRLPfarmer: Contract = {
  // LP
  chain: 'polygon',
  address: '0x5b540e16638dec22d700276a2c3e5e89cbbd466e',
  token: '0x700d6e1167472bdc312d9cbbdc7c58c7f4f45120',
  underlyings: ['0x6ae96cc93331c19148541d4d2f31363684917092', '0x7238390d5f6f64e67c3211c343a410e2a3dec142'],
  rewards: ['0x6ae96cc93331c19148541d4d2f31363684917092'],
}

const locker: Contract = {
  chain: 'polygon',
  address: '0xdc7ee66c43f35ac8c1d12df90e61f05fbc2cd2c1',
  token: '0x49e6A20f1BBdfEeC2a8222E052000BbB14EE6007',
}

export const getContracts = () => {
  return {
    contracts: { stakers, locker, CVRfarmer, CVRLPfarmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getTangibleStakeBalance,
    locker: getTangibleLockerBalances,
    CVRfarmer: (...args) => getCVRFarmBalance(...args, stakers[1]),
    CVRLPfarmer: getCVRLPFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
