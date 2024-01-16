import { getCycloneBalances } from '@adapters/cyclone/common/balance'
import { getCycloneContract } from '@adapters/cyclone/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xdc71bc29d12960a3ee5452fac6f033a1b8e756fb',
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
