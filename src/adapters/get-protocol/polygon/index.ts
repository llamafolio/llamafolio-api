import { getGetProtocolBalance } from '@adapters/get-protocol/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const xGET: Contract = {
  chain: 'polygon',
  address: '0x3e49e9c890cd5b015a18ed76e7a4093f569f1a04',
  token: '0xdb725f82818de83e99f1dac22a9b5b51d3d04dd4',
}

export const getContracts = () => {
  return {
    contracts: { xGET },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xGET: getGetProtocolBalance,
  })

  return {
    groups: [{ balances }],
  }
}
