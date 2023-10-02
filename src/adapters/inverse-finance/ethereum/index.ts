import { getInverseMarketsBalances, getInverseMarketsContracts } from '@adapters/inverse-finance/ethereum/market'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsContracts } from '@lib/compound/v2/lending'

import { getInverseLendingBalances } from './balance'

const contracts: Contract[] = [
  { chain: 'ethereum', address: '0x63fad99705a255fe2d500e498dbb3a9ae5aa1ee8' },
  { chain: 'ethereum', address: '0x3474ad0e3a9775c9f68b415a7a9880b0cab9397a' },
  { chain: 'ethereum', address: '0xb516247596ca36bf32876199fbdcad6b3322330b' },
  { chain: 'ethereum', address: '0x7cd3ab8354289bef52c84c2bf0a54e3608e66b37' },
  { chain: 'ethereum', address: '0x743a502cf0e213f6fee56cd9c6b03de7fa951dcf' },
  { chain: 'ethereum', address: '0x27b6c301fd441f3345d61b7a4245e1f823c3f9c4' },
  { chain: 'ethereum', address: '0x93685185666c8d34ad4c574b3dbf41231bbfb31b' },
  { chain: 'ethereum', address: '0x63df5e23db45a2066508318f172ba45b9cd37035' },
]

// Deprecated -> https://docs.inverse.finance/inverse-finance/technical/smart-contracts
const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x4dcf7407ae5c07f8681e1659f626e114a7667339',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, markets] = await Promise.all([
    getMarketsContracts(ctx, {
      // Inverse-finance comptroller
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // anETH -> wETH
        '0x697b4acaa24430f254224eb794d2a85ba1fa1fb8': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        '0x1637e4e9941d55703a7a5e7807d6ada3f7dcd61b': '0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68',
      },
    }),
    getInverseMarketsContracts(ctx, contracts),
  ])

  return {
    contracts: { pools, comptroller, markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getInverseLendingBalances(...args, comptroller),
    markets: getInverseMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
