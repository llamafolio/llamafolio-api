import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

import { getAtlantisFarmBalances } from '../common/farm'

const atlx: Token = {
  chain: 'polygon',
  address: '0x0b68782eff3177f1f9240b64a7e2f8e0497e2454',
  decimals: 18,
  symbol: 'ATLX',
}

const usdc: Token = {
  chain: 'polygon',
  address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  decimals: 6,
  symbol: 'USDC',
}

const atlStaker: Contract = {
  chain: 'polygon',
  address: '0xc8cf4af53fe1ae6ba29be86d4bcb97fac6d4f7de',
  underlyings: [atlx],
}

const lpStaker: Contract = {
  chain: 'polygon',
  address: '0xd771bf2930628258bfcc37707f4334b4b0c0f2dc',
  lpToken: { address: '0x350cac55be4db9f043e5c20e8ef0e0dbd604fea5', symbol: 'UNI-V2' },
  underlyings: [atlx, usdc],
}

const Comptroller: Contract = {
  chain: 'polygon',
  address: '0x8f85ee1c0a96734cb76870106dd9c016db6de09a',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // aMATIC -> MATIC
      '0xa65722af4957cef481edb4cb255f804dd36e8adc': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
  })

  return {
    contracts: { markets, Comptroller, stakers: [atlStaker, lpStaker] },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    stakers: (...args) => getAtlantisFarmBalances(...args, atlx),
  })

  return {
    groups: [{ balances }],
  }
}
