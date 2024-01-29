import type { AdapterConfig } from "@lib/adapter";import { getSteerBalances } from '@adapters/steer-protocol/common/balance'
import { getSteerPools } from '@adapters/steer-protocol/common/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const graph_url = 'https://api.thegraph.com/subgraphs/name/steerprotocol/steer-protocol-bsc'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSteerPools(ctx, graph_url)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSteerBalances(...args, graph_url),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1687824000,
                  }
                  