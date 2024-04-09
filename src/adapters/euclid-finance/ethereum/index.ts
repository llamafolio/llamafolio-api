import { getEuclidBalance } from '@adapters/euclid-finance/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const elETH: Contract = {
  chain: 'ethereum',
  address: '0xa1aeea28896f18ba85715ce9367f3689925ed428',
  decimals: 18,
  symbol: 'elETH',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

export const getContracts = () => {
  return {
    contracts: { elETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    elETH: getEuclidBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1707091200,
}
