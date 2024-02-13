import { getmpETHBalance } from '@adapters/meta-pool/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const mpETH: Contract = {
  chain: 'ethereum',
  address: '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

export const getContracts = () => {
  return {
    contracts: { mpETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, { mpETH: getmpETHBalance })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1692230400,
}
