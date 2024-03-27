import { getDefinitiveBalances } from '@adapters/definitive.fi/common/balance'
import { getDefinitiveContracts } from '@adapters/definitive.fi/common/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = ['0x449b72B665C28D6190ff08A21b2130CaCf06E1c8']

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
