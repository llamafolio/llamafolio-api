import { getKelpBalances } from '@adapters/kelp-dao/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const rsETH: Contract = {
  chain: 'ethereum',
  address: '0xa1290d69c65a6fe4df752f95823fae25cb99e5a7',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  category: 'stake',
}

export const getContracts = () => {
  return {
    contracts: { rsETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    rsETH: getKelpBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1703116800,
}
