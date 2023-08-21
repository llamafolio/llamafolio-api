import { getMarketsContracts } from '@adapters/moonwell/common/market'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

const WELL: Token = {
  chain: 'base',
  address: '0xff8adec2221f9f4d8dfbafa6b9a297d17603493d',
  decimals: 18,
  symbol: 'WELL',
}

const comptroller: Contract = {
  chain: 'base',
  address: '0xfBb21d0380beE3312B33c4353c8936a0F13EF26C',
  underlyings: [WELL],
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {},
  })

  return {
    contracts: { markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
