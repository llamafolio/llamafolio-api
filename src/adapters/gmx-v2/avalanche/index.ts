import { getGMXBalances } from '@adapters/gmx-v2/common/balance'
import { readGMXMarkets } from '@adapters/gmx-v2/common/market'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const exchangeRouter: Contract = {
  chain: 'avalanche',
  address: '0x79be2f4ec8a4143baf963206cf133f3710856d0a',
}

const dataStore: Contract = {
  chain: 'avalanche',
  address: '0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6',
}

const reader: Contract = {
  chain: 'avalanche',
  address: '0xE27b070A6a5567770360A6781263F09F904da71a',
}

export const getContracts = async (ctx: BaseContext) => {
  const router = await readGMXMarkets(ctx, reader, dataStore, exchangeRouter)

  return {
    contracts: { router },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    router: (...args) => getGMXBalances(...args, reader, dataStore),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1691539200,
}
