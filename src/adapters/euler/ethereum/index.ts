import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getHealthFactor, getMarketsBalances, getMarketsContracts } from '../common/markets'

const lens: Contract = {
  chain: 'ethereum',
  name: 'Euler Simple Lens',
  address: '0x5077B7642abF198b4a5b7C4BdCE4f03016C7089C',
}

export const getContracts = async () => {
  const markets = await getMarketsContracts('ethereum')

  return {
    contracts: { markets, lens },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    markets: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(ctx, 'ethereum', lens)

  return {
    balances,
    healthFactor,
  }
}
