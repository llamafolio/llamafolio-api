import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { Token } from '@lib/token'

import { getRewardsBalances } from './rewards'

const COMPToken: Token = {
  chain: 'ethereum',
  address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
  decimals: 18,
  symbol: 'COMP',
  coingeckoId: 'compound-governance-token',
}

const Comptroller: Contract = {
  chain: 'ethereum',
  address: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
}

const getContracts = async () => {
  const markets = await getMarketsContracts('ethereum', {
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // cETH -> WETH
      '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })

  return {
    contracts: { markets, Comptroller },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { markets, Comptroller }) => {
  const marketsBalances = await getMarketsBalances(ctx, 'ethereum', markets)
  const rewardsBalances = await getRewardsBalances('ethereum', marketsBalances, Comptroller)

  return {
    balances: marketsBalances,
  }
}

const adapter: Adapter = {
  id: 'compound',
  getContracts,
  getBalances,
}

export default adapter
