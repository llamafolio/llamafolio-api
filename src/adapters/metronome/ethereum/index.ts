import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMetronomeBalances } from '../common/balance'
import { getMetronomeContracts } from '../common/contract'

const market: Contract = {
  chain: 'ethereum',
  address: '0x3364f53cb866762aef66deef2a6b1a17c1f17f46',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMetronomeContracts(ctx, market)

  return {
    contracts: { markets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMetronomeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
