import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances, getPoolsContracts } from '../common/balance'

const MiniChef: Contract = {
  chain: 'bsc',
  address: '0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, MiniChef)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getPoolsBalances(...args, MiniChef),
  })

  return {
    balances,
  }
}
