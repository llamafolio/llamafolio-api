import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
    offset,
    limit,
  })

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  // Any method to check the contracts retrieved above (based on user interaction).
  // This function will be run each time a user queries his balances.
  // As static contracts info is filled in getContracts, this should ideally only fetch the current amount of each contract (+ underlyings and rewards)
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {})

  return {
    balances,
  }
}
