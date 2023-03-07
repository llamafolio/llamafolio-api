import { BalancesContext, BaseContext, Contract } from '@lib/adapter'

import { ProviderBalancesParams } from './interface'

export const aaveProvider = async (_ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  for (const pool of pools) {
    pool.underlyings = ['0x853d955aCEf822Db058eb8505911ED77F175b99e'] // FRAX
  }

  return pools
}

export const aaveBalancesProvider = async (
  _ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  return pools
}
