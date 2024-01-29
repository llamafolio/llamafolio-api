import { getCycloneBalances } from '@adapters/cyclone/common/balance'
import { getCycloneContract } from '@adapters/cyclone/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'bsc',
  address: '0x92a737097d711bec4c31351997254e98e5f0d430',
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
  startDate: 1643328000,
}
