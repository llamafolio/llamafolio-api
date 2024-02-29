import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getGainsBalances } from '../common/farm'
import { getGainsLockerBalances } from '../common/locker'
import { getGainsNetworkStakeBalance, getsgGNSBalance } from '../common/stake'

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

const GNS_staking_v6: Contract = {
  chain: 'arbitrum',
  address: '0x6b8d3c08072a020ac065c467ce922e3a36d3f9d6',
  token: '0x18c11fd286c5ec11c3b683caa813b77f5163a122',
  rewards: [DAI],
}

const sGNS: Contract = {
  chain: 'arbitrum',
  address: '0x7edde7e5900633f698eab0dbc97de640fc5dc015',
  token: '0x18c11FD286C5EC11c3b683Caa813B77f5163A122',
  rewards: [
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  ],
}

export const getContracts = () => {
  return {
    contracts: { gDAI, locker, sGNS, GNS_staking_v6 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    gDAI: getGainsBalances,
    locker: getGainsLockerBalances,
    GNS_staking_v6: getGainsNetworkStakeBalance,
    sGNS: getsgGNSBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1674432000,
}
