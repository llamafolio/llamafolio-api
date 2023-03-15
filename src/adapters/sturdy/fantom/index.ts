import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/aave/v2/lending'
import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  name: 'Lending Pool',
  address: '0x7FF2520Cd7b76e8C49B5DB51505b842d665f3e9A',
  chain: 'fantom',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts(ctx, lendingPool)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getLendingPoolBalances,
  })

  return {
    groups: [{ balances }],
  }
}
