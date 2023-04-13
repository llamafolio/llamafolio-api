import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGammaFarmBalances } from '../common/balance'
import { getPoolContractsFromAPI } from '../common/contract'

const API_URL = 'https://wire2.gamma.xyz/arbitrum/hypervisors/allData'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolContractsFromAPI(ctx, API_URL)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getGammaFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
