import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const pools = await getMarketsContracts('ethereum', {
    // Inverse-finance comptroller
    comptrollerAddress: '0x4dcf7407ae5c07f8681e1659f626e114a7667339',
    underlyingAddressByMarketAddress: {
      // anETH -> wETH
      '0x697b4acaa24430f254224eb794d2a85ba1fa1fb8': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    pools: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    balances,
    healthFactor,
  }
}
