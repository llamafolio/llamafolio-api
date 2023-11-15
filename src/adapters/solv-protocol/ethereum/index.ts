import { getSolvFarmBalances } from '@adapters/solv-protocol/common/balance'
import { getSolvContracts } from '@adapters/solv-protocol/common/pool'
import { getSolvVestingBalances } from '@adapters/solv-protocol/common/vesting'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmers: Contract[] = [
  { chain: 'ethereum', address: '0xfef2625c1a03dc8e29c0c183efd0502193708e74' },
  { chain: 'ethereum', address: '0x66e6b4c8aa1b8ca548cc4ebcd6f3a8c6f4f3d04d' },
  { chain: 'ethereum', address: '0xc4341c6e7df9db26a58e6ec3c53b937bdff06d65' },
  { chain: 'ethereum', address: '0xcd7bff6051fffcfc68846b4ae2da496ec5ff1d8b' },
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
