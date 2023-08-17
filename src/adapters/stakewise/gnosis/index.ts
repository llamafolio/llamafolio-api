import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getBalancesOf } from '@lib/erc20'

const sGNO: Contract = {
  chain: 'gnosis',
  address: '0xa4ef9da5ba71cc0d2e5e877a910a37ec43420445',
  underlyings: ['0x9c58bacc331c9aa871afd802db6379a98e80cedb'],
  category: 'stake',
}

const rGNO: Contract = {
  chain: 'gnosis',
  address: '0x6ac78efae880282396a335ca2f79863a1e6831d4',
  underlyings: ['0x9c58bacc331c9aa871afd802db6379a98e80cedb'],
  category: 'reward',
}

export const getContracts = () => {
  return {
    contracts: { stakes: [sGNO, rGNO] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakes: getBalancesOf,
  })

  return {
    groups: [{ balances }],
  }
}
