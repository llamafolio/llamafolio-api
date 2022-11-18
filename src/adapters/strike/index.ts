import { Adapter, GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const getContracts = async () => {
  const pools = await getMarketsContracts('ethereum', {
    // Strike comptroller
    comptrollerAddress: '0xe2e17b2cbbf48211fa7eb8a875360e5e39ba2602',
    underlyingAddressByMarketAddress: {
      // sETH -> WETH
      '0xbee9cf658702527b0acb2719c1faa29edc006a92': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
  })

  return {
    contracts: { pools },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  const balances = await getMarketsBalances(ctx, 'ethereum', pools || [])

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'strike',
  getContracts,
  getBalances,
}

export default adapter
