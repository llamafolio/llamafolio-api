import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const DYDX: Contract = {
  name: 'DYDX',
  address: '0x92d6c1e31e14520e676a687f0a93788b716beff5',
  chain: 'ethereum',
  symbol: 'DYDX',
  decimals: 18,
  coingeckoId: 'dydx',
  wallet: true,
  stable: false,
}

// dYdX Governance
const stkDYDX: Contract = {
  chain: 'ethereum',
  address: '0x65f7BA4Ec257AF7c55fd5854E5f6356bBd0fb8EC',
  symbol: 'stkDYDX',
  decimals: 18,
  category: 'stake',
  underlyings: [DYDX],
}

export const getContracts = async () => {
  return {
    contracts: { stkDYDX },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stkDYDX: getSingleStakeBalance,
  })

  return {
    balances,
  }
}
