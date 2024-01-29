import type { AdapterConfig } from "@lib/adapter";import { getReaperFarmBalances } from '@adapters/reaper-farm/common/balance'
import { getReaperPools } from '@adapters/reaper-farm/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getReaperPools(ctx)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getReaperFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1675209600,
                  }
                  