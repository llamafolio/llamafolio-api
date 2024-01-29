import { getRangeBalances } from '@adapters/range-protocol/common/balance'
import { getRangePools } from '@adapters/range-protocol/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'bsc',
  address: '0xad2b34a2245b5a7378964BC820e8F34D14adF312',
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
