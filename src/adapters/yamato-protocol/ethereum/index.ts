import { getYamatoCDPBalances } from '@adapters/yamato-protocol/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const controller: Contract = {
  chain: 'ethereum',
  address: '0x02fe72b2e9ff717ebf3049333b184e9cd984f257',
}

export const getContracts = () => {
  return {
    contracts: { controller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    controller: getYamatoCDPBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1691884800,
}
