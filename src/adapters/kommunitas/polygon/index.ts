import { getKommuLockerBalances } from '@adapters/kommunitas/common/locker'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'polygon',
  address: '0x8d34bb43429c124e55ef52b5b1539bfd121b0c8d',
  token: '0xC004e2318722EA2b15499D6375905d75Ee5390B8',
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
  startDate: 1645056000,
}
