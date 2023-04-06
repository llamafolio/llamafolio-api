import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getGainsBalances } from '../common/farm'
import { getGainsLockerBalances } from '../common/locker'
import { getGainsStakeBalances } from '../common/stake'

const DAI: Token = {
  chain: 'arbitrum',
  address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
  decimals: 18,
  symbol: 'DAI',
}

const gDAI: Contract = {
  chain: 'arbitrum',
  address: '0xd85e038593d7a098614721eae955ec2022b9b91b',
  underlyings: [DAI],
  decimals: 18,
  symbol: 'gDAI',
}

const locker: Contract = {
  chain: 'arbitrum',
  address: '0x673cf5ab7b44caac43c80de5b99a37ed5b3e4cc6',
  token: '0xd85e038593d7a098614721eae955ec2022b9b91b',
  underlyings: [DAI],
  decimals: 18,
  symbol: 'gNFT-DAI',
}

const staker: Contract = {
  chain: 'arbitrum',
  address: '0x6b8d3c08072a020ac065c467ce922e3a36d3f9d6',
  token: '0x18c11fd286c5ec11c3b683caa813b77f5163a122',
  underlyings: ['0x18c11fd286c5ec11c3b683caa813b77f5163a122'],
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
