import { getLendBorrowBalances } from '@adapters/fraxlend/ethereum/lend'
import type { BalancesContext, BaseContext, GetBalancesHandler } from '@lib/adapter'

import { getPairsContracts } from './registry'

const fraxLendPairRegistry = '0xd6e9d27c75afd88ad24cd5edccdc76fd2fc3a751'

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getPairsContracts(ctx, fraxLendPairRegistry)

  return {
    contracts: { pairs },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const vaultsBalancesGroups = await getLendBorrowBalances(ctx, contracts.pairs || [])

  return {
    groups: [...vaultsBalancesGroups],
  }
}
