import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

import { getFantohmLockerBalances } from './locker'
import { getwxFHMStakeBalances } from './stake'
import { getFHMVesterBalances } from './vest'

const sFHM: Contract = {
  chain: 'fantom',
  address: '0x5e983ff70de345de15dbdcf0529640f14446cdfa',
  underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  decimals: 9,
  symbol: 'sFHM',
}

const fwsFHM: Contract = {
  chain: 'fantom',
  address: '0x73199ba57bbfe82a935b9c95850395d80a400937',
  underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  decimals: 18,
  symbol: 'fwsFHM',
}

const lockers: Contract[] = [
  {
    chain: 'fantom',
    address: '0xb64a7a255c16c98f1e70219f6966860d6c6027c2',
    token: '0x73199ba57bbfe82a935b9c95850395d80a400937',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0xbd8116e52101f7b28c519766c7f7e7f9d844ead3',
    token: '0x73199ba57bbfe82a935b9c95850395d80a400937',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
]

const vesters: Contract[] = [
  {
    chain: 'fantom',
    address: '0x3c1a9b5ff3196c43bcb05bf1b7467fba8e07ee61',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0x462eec9f8a067f13b5f8f7356d807ff7f0e28c68',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0x6d0a19bbba84cc2fe3cb05b4d9a9aaf52fe9df63',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0x6134f5ae5979abe4f101bb405462babf83ba6c73',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0x6b5ec972a3d44d3da19258e96ccaa9826641b8a1',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0xd4b8a4e823923ac6f57e457615a57f41e09b5613',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0x71976906ad5520a1cb23fd40b40437c1a2640bcd',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
  {
    chain: 'fantom',
    address: '0x7a5523342bbafc43184f85805d0bacc68f2f3df1',
    token: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
    underlyings: ['0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286'],
  },
]

export const getContracts = () => {
  return {
    contracts: { sFHM, fwsFHM, lockers, vesters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sFHM: getSingleStakeBalance,
    fwsFHM: getwxFHMStakeBalances,
    lockers: getFantohmLockerBalances,
    vesters: getFHMVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1636070400,
}
