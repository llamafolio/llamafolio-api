import { getPrimeBalances } from '@adapters/prime-staked-eth/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const primeETH: Contract = {
  chain: 'ethereum',
  address: '0x6ef3D766Dfe02Dc4bF04aAe9122EB9A0Ded25615',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  symbol: 'primeETH',
  category: 'stake',
}

export const getContracts = () => {
  return {
    contracts: { primeETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    primeETH: getPrimeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1707177600,
}
