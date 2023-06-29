import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getBalancesOf } from '@lib/erc20'
import type { Token } from '@lib/token'

const CRETH2: Token = {
  chain: 'ethereum',
  address: '0x49d72e3973900a195a155a46441f0c08179fdb64',
  name: 'Cream ETH 2',
  symbol: 'CRETH2',
  decimals: 18,
}

export const getContracts = async () => {
  return {
    contracts: { CRETH2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    CRETH2: getBalancesOf,
  })

  return {
    groups: [{ balances }],
  }
}
