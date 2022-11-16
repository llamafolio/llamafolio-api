import { Adapter, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const getContracts = async () => {
  const pairs = await getPairsContracts({
    chain: 'fantom',
    factoryAddress: '0xef45d134b73241eda7703fa787148d9c9f4950b0',
    length: 100,
  })

  return {
    contracts: pairs,
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts: Contract[]) => {
  const balances = await getPairsBalances(ctx, 'fantom', contracts)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'spiritswap',
  getContracts,
  getBalances,
}

export default adapter
