import { getCollContracts } from '@adapters/compound-v3/common/asset'
import { getCompoundBalances } from '@adapters/compound-v3/common/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const USDbC: Token = {
  chain: 'base',
  address: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
  decimals: 6,
  symbol: 'USDbC',
}

const WETH: Token = {
  chain: 'base',
  address: '0x4200000000000000000000000000000000000006',
  decimals: 18,
  symbol: 'WETH',
}

const cUSDbCv3: Contract = {
  chain: 'base',
  address: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
}

const cWETHv3: Contract = {
  chain: 'base',
  address: '0x46e6b214b524310239732D51387075E0e70970bf',
}

const rewarder: Contract = {
  chain: 'base',
  address: '0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1',
}

export const getContracts = async (ctx: BaseContext) => {
  const [usdcCompounder, ethCompounder] = await Promise.all([
    getCollContracts(ctx, cUSDbCv3),
    getCollContracts(ctx, cWETHv3),
  ])

  return {
    contracts: { usdcCompounder, ethCompounder },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    usdcCompounder: (...args) => getCompoundBalances(...args, USDbC, rewarder),
    ethCompounder: (...args) => getCompoundBalances(...args, WETH, rewarder),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1692057600,
}
