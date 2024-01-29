import type { AdapterConfig } from "@lib/adapter";import { getEqPoolBalances } from '@adapters/equilibria/common/balance'
import { getEqPoolsContracts } from '@adapters/equilibria/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterChef: Contract = {
  chain: 'optimism',
  address: '0x18c61629e6cbadb85c29ba7993f251b3ebe2b356',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getEqPoolsContracts(ctx, masterChef)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getEqPoolBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1694390400,
                  }
                  