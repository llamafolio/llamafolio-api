import type { AdapterConfig } from "@lib/adapter";import { getRangeBalances } from '@adapters/range-protocol/common/balance'
import { getRangePools } from '@adapters/range-protocol/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'ethereum',
  address: '0xf1e70677fb1f49471604c012e8B42BA11226336b',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getRangePools(ctx, factory)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getRangeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1684454400,
                  }
                  