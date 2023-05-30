import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getActiveBondsBalances } from './bondNFT'
import { getChickenBondManagerContract } from './chickenBondManager'

export const getContracts = async (ctx: BaseContext) => {
  const chickenBondManager = await getChickenBondManagerContract(ctx)

  return {
    contracts: { chickenBondManager },
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
