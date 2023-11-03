import { getdHedgeBalances } from '@adapters/dhedge/common/balance'
import { getdHedgePools } from '@adapters/dhedge/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const TUSD: Contract = {
  chain: 'polygon',
  address: '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756',
  decimals: 18,
  symbol: 'TUSD',
}

const factory: Contract = {
  chain: 'polygon',
  address: '0xfdc7b8bFe0DD3513Cc669bB8d601Cb83e2F69cB0',
}

const poolPerformance: Contract = {
  chain: 'polygon',
  address: '0xd91315356f83529e321c73f74f93ad92d5b66018',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getdHedgePools(ctx, factory, TUSD)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getdHedgeBalances(...args, poolPerformance),
  })

  return {
    groups: [{ balances }],
  }
}
