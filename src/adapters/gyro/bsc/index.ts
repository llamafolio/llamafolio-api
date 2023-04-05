import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

import { getGyroLocker } from './locker'
import { getGyroVesterBalances } from './vester'

const sGYRO: Contract = {
  chain: 'bsc',
  address: '0x4fbcde2c859e3c1ab2034474e4d97a6beb220297',
  underlyings: ['0x1b239abe619e74232c827fbe5e49a4c072bd869d'],
  decimals: 9,
  symbol: 'sGYRO',
}

const locker: Contract = {
  chain: 'bsc',
  address: '0xeb84193d6d8ebfed5848517a923b8dc84f3de0a7',
  underlyings: ['0x1b239abe619e74232c827fbe5e49a4c072bd869d'],
}

const vesters: Contract[] = [
  {
    chain: 'bsc',
    address: '0xd6b1997149f1114f6251b6df1d907770ba6df819',
    token: '0x1b239abe619e74232c827fbe5e49a4c072bd869d',
    underlyings: ['0x1b239abe619e74232c827fbe5e49a4c072bd869d'],
  },
  {
    chain: 'bsc',
    address: '0xe259a3dfc976b43815c43723ecacb5c1e8794518',
    token: '0x1b239abe619e74232c827fbe5e49a4c072bd869d',
    underlyings: ['0x1b239abe619e74232c827fbe5e49a4c072bd869d'],
  },
]

export const getContracts = () => {
  return {
    contracts: { sGYRO, locker, vesters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sGYRO: getSingleStakeBalance,
    locker: getGyroLocker,
    vesters: getGyroVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}
