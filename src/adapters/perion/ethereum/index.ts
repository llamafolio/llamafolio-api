import { getsPERCBalances, getsPERCLPBalances } from '@adapters/perion/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sPERC: Contract = {
  chain: 'ethereum',
  address: '0xf64f48a4e27bbc299273532b26c83662ef776b7e',
  token: '0x60bE1e1fE41c1370ADaF5d8e66f07Cf1C2Df2268',
}
const sPERC_LP: Contract = {
  chain: 'ethereum',
  address: '0xc014286360ef45ab15a6d3f6bb1e54a03352ac8f',
  token: '0x45B6FFb13e5206dAFE2cc8780e4DDc0e32496265',
  underlyings: ['0x60bE1e1fE41c1370ADaF5d8e66f07Cf1C2Df2268', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

export const getContracts = () => {
  return {
    contracts: { sPERC, sPERC_LP },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sPERC: getsPERCBalances,
    sPERC_LP: getsPERCLPBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1677024000,
}
