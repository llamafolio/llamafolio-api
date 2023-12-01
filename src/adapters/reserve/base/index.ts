import { getReserveFarmBalances } from '@adapters/reserve/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmers: Contract[] = [
  {
    chain: 'base',
    address: '0x796d2367af69deb3319b8e10712b8b65957371c3',
    underlyings: ['0xab36452dbac151be02b16ca17d8919826072f64a'],
  },
]

export const getContracts = () => {
  return {
    contracts: { farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getReserveFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
