import { getTensorPlexBalance } from '@adapters/tensorplex/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stTAO: Contract = {
  chain: 'ethereum',
  address: '0xb60acd2057067dc9ed8c083f5aa227a244044fd6',
  underlyings: ['0x77E06c9eCCf2E797fd462A92B6D7642EF85b0A44'],
}

export const getContracts = () => {
  return {
    contracts: { stTAO },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stTAO: getTensorPlexBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1710892800,
}
