import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getActiveBondsBalances } from './bondNFT'
import { getChickenBondManagerContract } from './chickenBondManager'

export const getContracts = async (ctx: BaseContext) => {
  const chickenBondManager = await getChickenBondManagerContract(ctx)

  return {
    contracts: { chickenBondManager },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    chickenBondManager: getActiveBondsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1664928000,
}
