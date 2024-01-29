import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPopsicleFarmBalances, getPopsicleFarmContracts } from '../common/farm'

const farmer: Contract = {
  chain: 'fantom',
  address: '0xbf513ace2abdc69d38ee847effdaa1901808c31c',
  rewards: ['0xf16e81dce15b08f326220742020379b855b87df9'],
}

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getPopsicleFarmContracts(ctx, farmer)

  return {
    contracts: { contracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getPopsicleFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1619827200,
                  }
                  