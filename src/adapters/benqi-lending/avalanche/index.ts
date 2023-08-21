import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor, getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    // Benqi Comptroller
    comptrollerAddress: '0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4',
    underlyingAddressByMarketAddress: {
      // qiAVAX -> AVAX
      '0x5c0401e81bc07ca70fad469b451682c0d747ef1c': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    },
  })
  return {
    contracts: { markets },
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
