import { getStakewiseBalances } from '@adapters/stakewise/common/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sGNO: Contract = {
  chain: 'gnosis',
  address: '0xa4ef9da5ba71cc0d2e5e877a910a37ec43420445',
  token: '0x9c58bacc331c9aa871afd802db6379a98e80cedb',
  rewards: ['0x9c58bacc331c9aa871afd802db6379a98e80cedb'],
}

const rGNO: Contract = {
  chain: 'gnosis',
  address: '0x6ac78efae880282396a335ca2f79863a1e6831d4',
}

export const getContracts = () => {
  return {
    contracts: { sGNO },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sGNO: (...args) => getStakewiseBalances(...args, rGNO),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1649116800,
}
