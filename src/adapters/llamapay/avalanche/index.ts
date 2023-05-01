import { GetBalancesHandler } from '@lib/adapter'

import { getPayeeStreams } from '../common/streams'

// TODO: an account can be the recipient of a stream without interacting with any smart contract
export const getContracts = async () => {
  return {
    contracts: {},
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx) => {
  const streams = await getPayeeStreams(ctx)

  return {
    groups: [{ balances: streams }],
  }
}
