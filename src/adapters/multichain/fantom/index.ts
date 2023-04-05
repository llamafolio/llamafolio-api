import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'

const MULTI: Contract = {
  chain: 'fantom',
  address: '0x9fb9a33956351cf4fa040f65a13b835a3c8764e3',
  decimals: 18,
  symbol: 'MULTI',
}

const locker: Contract = {
  chain: 'fantom',
  address: '0xe564cbcd78a76fd0bb716a8e4252dff06c2e4ae7',
  decimals: 18,
  underlyings: ['0x9fb9a33956351cf4fa040f65a13b835a3c8764e3'],
  symbol: 'veMULTI',
}

export const getContracts = async () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: (...args) => getNFTLockerBalances(...args, MULTI, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
