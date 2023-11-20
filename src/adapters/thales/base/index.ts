import { getThalesStakingBalance, getVeThalesBalance } from '@adapters/thales/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const thalesStaking: Contract = {
  chain: 'base',
  address: '0x84ab38e42d8da33b480762cca543eeca6135e040',
  token: '0xf34e0cff046e154cafcae502c7541b9e5fd8c249',
  rewards: ['0xf34e0cff046e154cafcae502c7541b9e5fd8c249'],
}

const veThales: Contract = {
  chain: 'arbitrum',
  address: '0x29dfc5fee05578cd913c75ff1c7a0d315595939a',
  token: '0xf34e0cff046e154cafcae502c7541b9e5fd8c249',
}

export const getContracts = () => {
  return {
    contracts: { thalesStaking, veThales },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    thalesStaking: getThalesStakingBalance,
    veThales: getVeThalesBalance,
  })

  return {
    groups: [{ balances }],
  }
}
