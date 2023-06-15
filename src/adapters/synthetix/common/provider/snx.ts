import type { ProviderBalancesParams } from '@adapters/badger-dao/common/provider'
import type { Balance, BalancesContext } from '@lib/adapter'

export const getSnxProvider = async (
  _ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  for (const pool of pools) {
    const { amount, underlyings } = pool
    if (underlyings && underlyings.length < 2) {
      ;(pool.underlyings![0] as Balance).amount = amount
    }
  }

  return pools
}
