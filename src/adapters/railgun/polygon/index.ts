import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getRailgunBalances } from '../common/balance'

const railgunStaker: Contract = {
  chain: 'polygon',
  address: '0x9AC2bA4bf7FaCB0bbB33447e5fF8f8D63B71dDC1',
  token: '0x92A9C92C215092720C731c96D4Ff508c831a714f',
}

export const getContracts = () => {
  return {
    contracts: { railgunStaker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    railgunStaker: getRailgunBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1643846400,
                  }
                  