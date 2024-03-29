import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFarmingBalances } from './farm'
import { getHECLockerBalances } from './locker'
import { getsStakeBalances, getWsStakeBalances } from './stake'

const TOR: Contract = {
  name: 'TOR',
  chain: 'fantom',
  address: '0x74e23df9110aa9ea0b6ff2faee01e740ca1c642e',
  decimals: 18,
  symbol: 'TOR',
}

const DAI: Contract = {
  name: 'Dai Stablecoin',
  chain: 'fantom',
  address: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
  decimals: 18,
  symbol: 'DAI',
}

const USDC: Contract = {
  name: 'USD Coin',
  chain: 'fantom',
  address: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
  decimals: 18,
  symbol: 'USDC',
}

const wFTM: Contract = {
  name: 'Wrapped Fantom',
  chain: 'fantom',
  address: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  decimals: 18,
  symbol: 'wFTM',
}

const HEC: Contract = {
  name: 'Hector',
  chain: 'fantom',
  address: '0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0',
  decimals: 9,
  symbol: 'HEC',
}

const sHEC: Contract = {
  name: 'Staked Hector',
  chain: 'fantom',
  address: '0x75bdef24285013387a47775828bec90b91ca9a5f',
  decimals: 9,
  symbol: 'sHEC',
  underlyings: [HEC],
}

const wsHEC: Contract = {
  name: 'Wrapped sHEC',
  chain: 'fantom',
  address: '0x94CcF60f700146BeA8eF7832820800E2dFa92EdA',
  decimals: 18,
  symbol: 'wsHEC',
  underlyings: [HEC],
}

const Curve_fiFactoryUSDMetapool: Contract = {
  name: 'Curve.fi Factory USD Metapool: TOR-2pool ',
  address: '0x24699312CB27C26Cfc669459D670559E5E44EE60',
  chain: 'fantom',
  underlyings: [TOR, DAI, USDC],
  rewards: [wFTM],
}

const StakingGateway: Contract = {
  name: 'StakingGateway',
  address: '0x86fb74B3b1949985AC2081B9c679d84BB44A2bf2',
  chain: 'fantom',
  underlyings: [Curve_fiFactoryUSDMetapool],
}

const fnftLocker: Contract = {
  chain: 'fantom',
  address: '0x80993b75e38227f1a3af6f456cf64747f0e21612',
  token: '0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0',
  underlyings: ['0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0'],
  rewards: ['0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0'],
}

const fnftLocker_HEC_TOR: Contract = {
  chain: 'fantom',
  address: '0xb13610b4e7168f664fcef2c6ebc58990ae835ff1',
  token: '0x4339b475399ad7226be3ad2826e1d78bbfb9a0d9',
  lpToken: '0x4339b475399ad7226be3ad2826e1d78bbfb9a0d9',
  underlyings: ['0x5c4fdfc5233f935f20d2adba572f770c2e377ab0', '0x74e23df9110aa9ea0b6ff2faee01e740ca1c642e'],
  rewards: ['0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0'],
}

const fnftLocker_HEC_USDC: Contract = {
  chain: 'fantom',
  address: '0xd7fae64dd872616587cc8914d4848947403078b8',
  token: '0x0b9589A2C1379138D4cC5043cE551F466193c8dE',
  lpToken: '0x0b9589A2C1379138D4cC5043cE551F466193c8dE',
  underlyings: ['0x04068da6c83afcfa0e13ba15a6696662335d5b75', '0x5c4fdfc5233f935f20d2adba572f770c2e377ab0'],
  rewards: ['0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0'],
}

export const getContracts = () => {
  return {
    contracts: { sHEC, wsHEC, StakingGateway, lockers: [fnftLocker, fnftLocker_HEC_TOR, fnftLocker_HEC_USDC] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sHEC: getsStakeBalances,
    wsHEC: getWsStakeBalances,
    StakingGateway: getFarmingBalances,
    lockers: getHECLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
