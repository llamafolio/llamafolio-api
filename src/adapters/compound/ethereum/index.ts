import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import type { Token } from '@lib/token'

import { getRewardsBalances } from '../common/rewards'

const COMP: Token = {
  chain: 'ethereum',
  address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
  decimals: 18,
  symbol: 'COMP',
  coingeckoId: 'compound-governance-token',
}

const compoundLens: Contract = {
  chain: 'ethereum',
  address: '0xdCbDb7306c6Ff46f77B349188dC18cEd9DF30299',
  underlyings: [COMP],
}

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
  underlyings: [COMP],
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // cETH -> WETH
      '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })

  return {
    contracts: { markets, comptroller },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    comptroller: (...args) => getRewardsBalances(...args, compoundLens),
  })

  return {
    groups: [{ balances }],
  }
}
