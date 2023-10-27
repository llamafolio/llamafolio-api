import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getMetronomeBalances } from '../common/balance'
import { getMetronomeContracts } from '../common/contract'

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

const market: Contract = {
  chain: 'optimism',
  address: '0x6394152946dc3e0babaa474ee9d366ef31f959c0',
}

const incentiveDistributor: Contract = {
  chain: 'optimism',
  address: '0xEBe91F52766Dd236b6E8C1951f6a4a8Bcc47A71e',
  underlyings: [OP],
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
    markets: (...args) => getMetronomeBalances(...args, incentiveDistributor),
  })

  return {
    groups: [{ balances }],
  }
}
