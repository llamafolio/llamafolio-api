import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const pairs = await getPairsContracts({
    chain: 'fantom',
    factoryAddress: '0xef45d134b73241eda7703fa787148d9c9f4950b0',
    offset,
    limit,
  })

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'fantom', contracts, {
    pairs: getPairsBalances,
  })

  return {
    balances,
  }
}
