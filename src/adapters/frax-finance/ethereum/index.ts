import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFraxBalances } from './balance'
import { getFraxContracts } from './contract'
import contractsLists from './contracts.json'

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getFraxContracts(ctx, contractsLists)

  return {
    contracts: { contracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  console.log(contracts)

  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getFraxBalances,
  })

  return {
    balances,
  }
}
