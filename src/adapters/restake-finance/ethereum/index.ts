import { getRestakeFinanceStakes, getRestakeLockBalances } from '@adapters/restake-finance/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const rstETH: Contract = {
  chain: 'ethereum',
  address: '0xc3ac43635d7aa9bf361094656c85de3311be9a2c',
  underlyings: ['0xae7ab96520de3a18e5e111b5eaab095312d7fe84'],
}

const rmETH: Contract = {
  chain: 'ethereum',
  address: '0xcc9f8c2a6366556e1899e40782b7076db87dce27',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const rsfrxETH: Contract = {
  chain: 'ethereum',
  address: '0xdcf8905091a1c7b773ddb894d805178701b32b55',
  underlyings: ['0xac3e018457b222d93114458476f3e3416abbe38f'],
}

const rosETH: Contract = {
  chain: 'ethereum',
  address: '0x3a2725556dde7b21fbe3dd64a4913ff29faba6a1',
  underlyings: ['0xf1c9acdc66974dfb6decb12aa385b9cd01190e38'],
}

const rankrETH: Contract = {
  chain: 'ethereum',
  address: '0x99c18df129482020112e1213007b8646018ddc8f',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xfb79e8fa6d436b0ce3629cb6858bb1755206e3fd',
  token: '0x12eF10A4fc6e1Ea44B4ca9508760fF51c647BB71',
}

export const getContracts = () => {
  return {
    contracts: { stakePools: [rstETH, rmETH, rsfrxETH, rosETH, rankrETH], locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakePools: getRestakeFinanceStakes,
    locker: getRestakeLockBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1707868800,
}
