import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { BalanceWithExtraProps, getHealthFactor, getMarketsContracts } from '@lib/compound/v2/lending'

import { getInverseLendingBalances } from './balance'

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x4dcf7407ae5c07f8681e1659f626e114a7667339',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getMarketsContracts(ctx, {
    // Inverse-finance comptroller
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // anETH -> wETH
      '0x697b4acaa24430f254224eb794d2a85ba1fa1fb8': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x1637e4e9941d55703a7a5e7807d6ada3f7dcd61b': '0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68',
    },
  })

  return {
    contracts: { pools, comptroller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getInverseLendingBalances(...args, comptroller),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
