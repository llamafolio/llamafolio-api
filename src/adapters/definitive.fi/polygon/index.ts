import { getDefinitiveBalances } from '@adapters/definitive.fi/common/balance'
import { getDefinitiveContracts } from '@adapters/definitive.fi/common/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = ['0x8347B60460421EE565F3aC26DaFbAC9D2fE8930e']

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
