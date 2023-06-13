import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getBalancesOf } from '@lib/erc20'
import type { Token } from '@lib/token'

const BETH: Token = {
  chain: 'ethereum',
  address: '0xa2e3356610840701bdf5611a53974510ae27e2e1',
  name: 'Wrapped Beacon ETH',
  symbol: 'WBETH',
  decimals: 18,
}

export const getContracts = async () => {
  return {
    contracts: { BETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    BETH: async (ctx, BETH) => {
      const { erc20 } = await getBalancesOf(ctx, [BETH])
      return erc20
    },
  })

  return {
    groups: [{ balances }],
  }
}
