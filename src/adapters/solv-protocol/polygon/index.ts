import { getSolvContracts } from '@adapters/solv-protocol/common/pool'
import { getSolvVestingBalances } from '@adapters/solv-protocol/common/vesting'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  const vestings = await getSolvContracts(ctx)

  return {
    contracts: { vestings },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vestings: getSolvVestingBalances,
  })

  return {
    groups: [{ balances }],
  }
}
