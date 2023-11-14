import { getHoprBalances } from '@adapters/hopr/gnosis/balance'
import { getHoprContracts } from '@adapters/hopr/gnosis/contract'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stakersAddresses: `0x${string}`[] = [
  '0xdc8f03f19986859362d15c3d5ed74f26518870b9',
  '0x65c39e6bd97f80b5ae5d2120a47644578fd2b8dc',
  '0xa02af160a280957a8881879ee9239a614ab47f0d',
  '0xae933331ef0be122f9499512d3ed4fa3896dcf20',
  '0x2cdd13ddb0346e0f620c8e5826da5d7230341c6e',
  '0x5bb7e435ada333a6714e27962e4bb6afde1cecd4',
  '0xd80fbbfe9d057254d80eebb49f17aca66a238e2d',
]

export const getContracts = async (ctx: BaseContext) => {
  const stakers = await getHoprContracts(ctx, stakersAddresses)

  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getHoprBalances,
  })

  return {
    groups: [{ balances }],
  }
}
