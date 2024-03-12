import { getGMXBalances } from '@adapters/gmx-v2/common/balance'
import { readGMXMarkets } from '@adapters/gmx-v2/common/market'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const exchangeRouter: Contract = {
  chain: 'arbitrum',
  address: '0x7c68c7866a64fa2160f78eeae12217ffbf871fa8',
}

const dataStore: Contract = {
  chain: 'arbitrum',
  address: '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8',
}

const reader: Contract = {
  chain: 'arbitrum',
  address: '0x60a0fF4cDaF0f6D496d71e0bC0fFa86FE8E6B23c',
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
