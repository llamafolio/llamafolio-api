import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGammaFarmBalances } from '../common/balance'
import { getPoolContractsFromAPI } from '../common/contract'

const API_URLs = [
  'https://wire2.gamma.xyz/arbitrum/hypervisors/allData',
  'https://wire2.gamma.xyz/zyberswap/arbitrum/hypervisors/allData',
  'https://wire2.gamma.xyz/sushi/arbitrum/hypervisors/allData',
  'https://wire2.gamma.xyz/camelot/arbitrum/hypervisors/allData',
  'https://wire2.gamma.xyz/ramses/arbitrum/hypervisors/allData',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolContractsFromAPI(ctx, API_URLs)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
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
