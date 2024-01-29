import { getRangeBalances } from '@adapters/range-protocol/common/balance'
import { getRangePools } from '@adapters/range-protocol/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'arbitrum',
  address: '0xB9084c75D361D1d4cfC7663ef31591DeAB1086d6',
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
