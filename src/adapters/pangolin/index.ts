import { Adapter, GetBalancesHandler } from '@lib/adapter'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const getContracts = async () => {
  const pairs = await getPairsContracts({
    chain: 'avax',
    factoryAddress: '0xefa94de7a4656d787667c749f7e1223d71e9fd88',
    length: 100,
  })

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pairs }) => {
  const balances = await getPairsBalances(ctx, 'avax', pairs || [])

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'pangolin',
  getContracts,
  getBalances,
}

export default adapter
