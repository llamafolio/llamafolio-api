import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const pools: Contract[] = [
  { chain: 'avax', address: '0x27cc2be95d1492bba726e10eba57968a065f05ec' },
  { chain: 'avax', address: '0xc725819a7c2a5d3da243e02eb886b4c5f2b4dc6a' },
  { chain: 'avax', address: '0x48a7d7d9b6d6529a3d191e434b71cdb874f29011' },
  { chain: 'avax', address: '0xea9345507c4055b2ac73c67e56f7207702fe66cc' },
]

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getPairsDetails(ctx, pools)

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
