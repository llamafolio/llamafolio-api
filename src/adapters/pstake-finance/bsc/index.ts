import { getpStakeBSCBalance } from '@adapters/pstake-finance/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stkBNB: Contract = {
  chain: 'bsc',
  address: '0xc2e9d07f66a89c44062459a47a0d2dc038e4fb16',
  decimals: 18,
  symbol: 'stkBNB',
  underlyings: ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'],
  vault: '0xc228cefdf841defdbd5b3a18dfd414cc0dbfa0d8',
}

export const getContracts = () => {
  return {
    contracts: { stkBNB },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stkBNB: getpStakeBSCBalance,
  })

  return {
    groups: [{ balances }],
  }
}
