import { getSolvFarmBalances } from '@adapters/solv-protocol/common/balance'
import { getSolvContracts } from '@adapters/solv-protocol/common/pool'
import { getSolvVestingBalances } from '@adapters/solv-protocol/common/vesting'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmers: Contract[] = [
  { chain: 'arbitrum', address: '0x22799daa45209338b7f938edf251bdfd1e6dcb32' },
  { chain: 'arbitrum', address: '0x66e6b4c8aa1b8ca548cc4ebcd6f3a8c6f4f3d04d' },
]

export const getContracts = async (ctx: BaseContext) => {
  const vestings = await getSolvContracts(ctx)

  return {
    contracts: { vestings, farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vestings: getSolvVestingBalances,
    farmers: getSolvFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
