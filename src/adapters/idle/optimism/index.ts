import { getIdleTrancheBalances, getIdleTranchePools } from '@adapters/idle/common/tranche'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const CDOS: `0x${string}`[] = [
  '0x8771128e9E386DC8E4663118BB11EA3DE910e528',
  '0x94e399Af25b676e7783fDcd62854221e67566b7f',
  '0xe49174f0935f088509cca50e54024f6f8a6e08dd',
]

export const getContracts = async (ctx: BaseContext) => {
  const tranchePools = await getIdleTranchePools(ctx, CDOS)

  return {
    contracts: { tranchePools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    tranchePools: getIdleTrancheBalances,
  })

  return {
    groups: [{ balances }],
  }
}
