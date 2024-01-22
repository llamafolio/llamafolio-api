import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'

const APW: Contract = {
  chain: 'ethereum',
  address: '0x0edefa91e99da1eddd1372c1743a63b1595fc413',
  decimals: 18,
  symbol: 'APW',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xc5ca1ebf6e912e49a6a70bb0385ea065061a4f09',
}

export const getContracts = () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: (...args) => getSingleLockerBalance(...args, APW, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
