import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pairs] = await Promise.all([
    getPairsContracts({
      chain: 'fantom',
      factoryAddress: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
      offset,
      limit,
    }),
  ])

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'fantom', contracts, {
    pairs: getPairsBalances,
  })

  return {
    balances: balances,
  }
}
