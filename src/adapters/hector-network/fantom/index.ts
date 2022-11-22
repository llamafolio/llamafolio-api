import { Contract, GetBalancesHandler } from '@lib/adapter'

import { getFarmingBalances, getStakeBalances } from './balances'

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

export const getContracts = () => {
  return {
    contracts: { wsHEC, StakingGateway },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { wsHEC, StakingGateway }) => {
  const [stakeBalances, farmingBalances] = await Promise.all([
    getStakeBalances(ctx, 'fantom', wsHEC),
    getFarmingBalances(ctx, 'fantom', StakingGateway),
  ])

  const balances = [...stakeBalances, ...farmingBalances]

  return {
    balances,
  }
}
