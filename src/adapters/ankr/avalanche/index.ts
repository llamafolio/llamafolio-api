import { getStakeBalance } from '@adapters/ankr/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const ankrAVAX: Contract = {
  chain: 'avalanche',
  address: '0xc3344870d52688874b06d844e0c36cc39fc727f6',
  underlyings: ['0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'],
}

export const getContracts = () => {
  return {
    contracts: { ankrAVAX },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    ankrAVAX: getStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
