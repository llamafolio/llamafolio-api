import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x895879b2c1fbb6ccfcd101f2d3f3c76363664f92',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // cozyETHVaults -> ETH
      '0xf8ec0f87036565d6b2b19780a54996c3b03e91ea': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x7d4377114fd3c61c59d72de48102bf6acd3882b1': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xb9351dcd5347a67a1a2e0e72c1d069fb1f2e1d65': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x43647239ede197099b57bf72d0373f8049acfb0f': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x40340fdce2310fdea42589c4a9fe029f1ed80730': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x93f02045b350877f82abbb387bc3f8a05ecb8aab': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xada37514948649a61a3d6da30585aaef78d88fe3': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })

  return {
    contracts: {
      markets,
    },
    revalidate: 60 * 60,
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
