import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const pairs = await getPairsContracts({
    chain: 'bsc',
    factoryAddress: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
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

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
  })

  return {
    balances,
  }
}
