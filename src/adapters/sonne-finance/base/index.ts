import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor, getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const comptroller: Contract = {
  chain: 'base',
  address: '0x1DB2466d9F5e10D7090E7152B68d62703a2245F0',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
  })

  return {
    contracts: { markets, comptroller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
