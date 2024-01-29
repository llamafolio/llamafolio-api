import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getGammaFarmBalances } from '../common/balance'
import { getPoolContractsFromAPI } from '../common/contract'
import { getxGammaBalances } from './stake'

const API_URLs = ['https://wire2.gamma.xyz/hypervisors/allData']

const xGamma: Contract = {
  chain: 'ethereum',
  address: '0x26805021988f1a45dc708b5fb75fc75f21747d8c',
  underlyings: ['0x6BeA7CFEF803D1e3d5f7C0103f7ded065644e197'],
  decimals: 18,
  symbol: 'xGAMMA',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolContractsFromAPI(ctx, API_URLs)

  return {
    contracts: { xGamma, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xGamma: getxGammaBalances,
    pools: getGammaFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1643241600,
                  }
                  