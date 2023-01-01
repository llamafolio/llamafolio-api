import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getERC20BalanceOf } from '@lib/erc20'
import { Token } from '@lib/token'

import { getHealthFactor, getMarketsContracts } from '../common/markets'

const lens: Contract = {
  chain: 'ethereum',
  name: 'Euler Simple Lens',
  address: '0x5077B7642abF198b4a5b7C4BdCE4f03016C7089C',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx)

  return {
    contracts: { markets, lens },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      markets: (ctx, contracts) => getERC20BalanceOf(ctx, contracts as Token[]),
    }),
    getHealthFactor(ctx, lens),
  ])

  return {
    balances,
    healthFactor,
  }
}
