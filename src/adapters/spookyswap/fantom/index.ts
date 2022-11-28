import { GetBalancesHandler } from '@lib/adapter'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const pairs = await getPairsContracts({
    chain: 'fantom',
    factoryAddress: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
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

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pairs }) => {
  const balances = await getPairsBalances(ctx, 'fantom', pairs || [])

  return {
    balances,
  }
}
