import { getSherlockBalances } from '@adapters/sherlock/ethereum/farm'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sherlockPos: Contract = {
  chain: 'ethereum',
  address: '0x0865a889183039689034dA55c1Fd12aF5083eabF',
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { sherlockPos },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sherlockPos: getSherlockBalances,
  })

  return {
    groups: [{ balances }],
  }
}
