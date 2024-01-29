import { getGetProtocolBalance } from '@adapters/get-protocol/common/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const xGET: Contract = {
  chain: 'ethereum',
  address: '0x3e49e9c890cd5b015a18ed76e7a4093f569f1a04',
  token: '0x8a854288a5976036A725879164Ca3e91d30c6A1B',
}

export const getContracts = () => {
  return {
    contracts: { xGET },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xGET: getGetProtocolBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1679875200,
}
