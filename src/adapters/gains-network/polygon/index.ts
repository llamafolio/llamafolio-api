import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getGainsBalances } from '../common/farm'
import { getGainsLockerBalances } from '../common/locker'
import { getGainsStakeBalances } from '../common/stake'

const DAI: Token = {
  chain: 'polygon',
  address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  decimals: 18,
  symbol: 'DAI',
}

const gDAI: Contract = {
  chain: 'polygon',
  address: '0x91993f2101cc758d0deb7279d41e880f7defe827',
  underlyings: [DAI],
  decimals: 18,
  symbol: 'gDAI',
}

const locker: Contract = {
  chain: 'polygon',
  address: '0xdd42aa3920c1d5b5fd95055d852135416369bcc1',
  token: '0x91993f2101cc758d0deb7279d41e880f7defe827',
  underlyings: [DAI],
  decimals: 18,
  symbol: 'gNFT-DAI',
}

const staker: Contract = {
  chain: 'polygon',
  address: '0xfb06a737f549eb2512eb6082a808fc7f16c0819d',
  token: '0xe5417af564e4bfda1c483642db72007871397896',
  underlyings: ['0xe5417af564e4bfda1c483642db72007871397896'],
  rewards: [DAI],
}

export const getContracts = () => {
  return {
    contracts: { gDAI, locker, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    gDAI: getGainsBalances,
    locker: getGainsLockerBalances,
    staker: getGainsStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
