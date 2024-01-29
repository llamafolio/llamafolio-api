import type { AdapterConfig } from "@lib/adapter";import { getCycloneBalances } from '@adapters/cyclone/common/balance'
import { getCycloneContract } from '@adapters/cyclone/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'polygon',
  address: '0xa8c187d8773bc9e49a10554715ff49bdcf39d55d',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCycloneContract(ctx, farmer)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getCycloneBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1631923200,
                  }
                  