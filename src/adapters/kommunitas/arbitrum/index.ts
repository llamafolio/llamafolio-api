import { getKommuLockerBalances } from '@adapters/kommunitas/common/locker'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'polygon',
  address: '0x5b63bdb6051ccb9c387252d8bd2364d7a86efc70',
  token: '0xa58663faef461761e44066ea26c1fcddf2927b80',
}

export const getContracts = () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, { locker: getKommuLockerBalances })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1687132800,
}
