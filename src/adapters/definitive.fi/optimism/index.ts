import { getDefinitiveBalances } from '@adapters/definitive.fi/common/balance'
import { getDefinitiveContracts } from '@adapters/definitive.fi/common/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0x3796103d23D207fB5db2CFEc97fd7a0ac0A70D82',
  '0xB2a74028CcCA97C4fA4686802246FdDEAa3A941B',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getDefinitiveContracts(ctx, poolAddresses)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getDefinitiveBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1709769600,
}
