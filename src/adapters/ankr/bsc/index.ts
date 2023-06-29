import { getStakeBalance } from '@adapters/ankr/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const ankrBNB: Contract = {
  chain: 'bsc',
  address: '0x52f24a5e03aee338da5fd9df68d2b6fae1178827',
  underlyings: ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'],
}

export const getContracts = () => {
  return {
    contracts: { ankrBNB },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    ankrBNB: getStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
