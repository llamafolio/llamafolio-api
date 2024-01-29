import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBellaBalances } from './balance'
import { getBellaContracts } from './contract'

const bellaStaking: Contract = {
  chain: 'ethereum',
  address: '0x6cb6ff550ea4473ed462f8bda38ae3226c04649d',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBellaContracts(ctx, bellaStaking)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getBellaBalances(...args, bellaStaking),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1614207600,
                  }
                  