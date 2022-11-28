import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'

import { getMarketsContracts } from '../common/markets'

export const getContracts = async () => {
  const markets = await getMarketsContracts('ethereum')

  return {
    contracts: { markets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    markets: (ctx, chain, contracts) => getERC20BalanceOf(ctx, chain, contracts as Token[]),
  })

  return {
    balances,
  }
}
