import { Adapter, GetBalancesHandler } from '@lib/adapter'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const getContracts = async () => {
  const pairs = await getPairsContracts({
    chain: 'fantom',
    factoryAddress: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
    length: 100,
  })

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pairs }) => {
  const balances = await getPairsBalances(ctx, 'fantom', pairs || [])

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'spookyswap',
  getContracts,
  getBalances,
}

export default adapter
