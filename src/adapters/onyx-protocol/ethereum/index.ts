import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

import { getOnyxPoolsContracts } from './contract'
import { getOnyxFarmBalances } from './farm'

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x7D61ed92a6778f5ABf5c94085739f1EDAbec2800',
}

const lendingPool: Contract = {
  chain: 'ethereum',
  address: '0x23445c63feef8d85956dc0f19ade87606d0e19a9',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, pools] = await Promise.all([
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // oETH -> WETH
        '0x714bd93ab6ab2f0bcfd2aeaf46a46719991d0d79': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      },
    }),
    getOnyxPoolsContracts(ctx, lendingPool),
  ])

  return {
    contracts: { markets, comptroller, lendingPool, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    pools: (...args) => getOnyxFarmBalances(...args, lendingPool),
  })

  return {
    groups: [{ balances }],
  }
}
