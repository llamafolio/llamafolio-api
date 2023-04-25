import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getTangibleLockerBalances } from './lock'
import { getTangibleStakeBalance } from './stake'

const staker: Contract = {
  chain: 'polygon',
  address: '0xaf0d9d65fc54de245cda37af3d18cbec860a4d4b',
  symbol: 'wUSDR',
  decimals: 9,
}

const locker: Contract = {
  chain: 'polygon',
  address: '0xdc7ee66c43f35ac8c1d12df90e61f05fbc2cd2c1',
  token: '0x49e6A20f1BBdfEeC2a8222E052000BbB14EE6007',
}

export const getContracts = () => {
  return {
    contracts: { staker, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getTangibleStakeBalance,
    locker: getTangibleLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
