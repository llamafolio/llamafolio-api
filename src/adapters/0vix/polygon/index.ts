import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor, getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const Comptroller: Contract = {
  chain: 'polygon',
  address: '0x8849f1a0cB6b5D6076aB150546EddEe193754F1C',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // oMatic -> Matic
      '0xe554e874c9c60e45f1debd479389c76230ae25a8': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
      // oDAI -> DAI
      '0x6f063fe661d922e4fd77227f8579cb84f9f41f0b': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    },
  })

  return {
    contracts: { markets, Comptroller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor: healthFactor! * Math.pow(10, 18) }],
  }
}
