import { getGambitBalance } from '@adapters/gambit-trade/arbitrum/balance'
import { getGambitStakeBalance } from '@adapters/gambit-trade/arbitrum/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'arbitrum',
  address: '0x05027e21f6cefb38970f4e0c04cd6daca15acbce',
  token: '0x4e7e5023656863E26f50E2E6E59489A852C212c1',
  rewards: ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831'],
}

const gUSDC: Contract = {
  chain: 'arbitrum',
  address: '0xac29f414fb40ba4e29ab8504a55cbffd315d2430',
  underlyings: ['0xaf88d065e77c8cC2239327C5EDb3A432268e5831'],
}

export const getContracts = () => {
  return {
    contracts: { staker, gUSDC },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getGambitStakeBalance,
    gUSDC: getGambitBalance,
  })

  return {
    groups: [{ balances }],
  }
}
