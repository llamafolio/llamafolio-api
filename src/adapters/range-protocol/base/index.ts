import { getRangeBalances } from '@adapters/range-protocol/common/balance'
import { getRangePools } from '@adapters/range-protocol/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'base',
  address: '0x4bF9CDcCE12924B559928623a5d23598ca19367B',
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
  startDate: 1693353600,
}
