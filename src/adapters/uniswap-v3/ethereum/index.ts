import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from '../common/pools'

// https://docs.uniswap.org/contracts/v3/reference/deployments
export const factory: Contract = {
  chain: 'ethereum',
  address: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'ethereum',
  address: '0xc36442b4a4522e871399cd717abdd847ab11fe88',
}

export const getContracts = async () => {
  return {
    contracts: { nonFungiblePositionManager },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    nonFungiblePositionManager: (ctx, nonFungiblePositionManager) =>
      getPoolsBalances(ctx, nonFungiblePositionManager, factory),
  })

  return {
    groups: [{ balances }],
  }
}
