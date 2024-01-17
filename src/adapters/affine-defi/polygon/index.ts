import { getAffineBalances } from '@adapters/affine-defi/polygon/balance'
import { getAffineContracts } from '@adapters/affine-defi/polygon/contract'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getAffineContracts(ctx)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getAffineBalances,
  })

  return {
    groups: [{ balances }],
  }
}
