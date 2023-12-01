import { getReserveFarmBalances } from '@adapters/reserve/common/balance'
import { getReserveLockers } from '@adapters/reserve/common/lock'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x18ba6e33ceb80f077deb9260c9111e62f21ae7b8',
    underlyings: ['0x320623b8E4fF03373931769A31Fc52A4E78B5d70'],
  },
  {
    chain: 'ethereum',
    address: '0x7db3c57001c80644208fb8aa81ba1200c7b0731d',
    underlyings: ['0x320623b8E4fF03373931769A31Fc52A4E78B5d70'],
  },
  {
    chain: 'ethereum',
    address: '0xffa151ad0a0e2e40f39f9e5e9f87cf9e45e819dd',
    underlyings: ['0x320623b8E4fF03373931769A31Fc52A4E78B5d70'],
  },
]

const locker: Contract = {
  chain: 'ethereum',
  address: '0x18ba6e33ceb80f077deb9260c9111e62f21ae7b8',
  underlyings: ['0x320623b8e4ff03373931769a31fc52a4e78b5d70'],
}

export const getContracts = () => {
  return {
    contracts: { farmers, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getReserveFarmBalances,
    locker: getReserveLockers,
  })

  return {
    groups: [{ balances }],
  }
}
