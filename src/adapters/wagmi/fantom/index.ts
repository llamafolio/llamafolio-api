import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const factory: Contract = {
  chain: 'fantom',
  address: '0xaf20f5f19698f1d19351028cd7103b63d30de7d7',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'fantom',
  address: '0x5973c9e4cc849140cfd1c9dfc75d54d804b5a2fe',
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

export const config: AdapterConfig = {
  startDate: 1681862400,
}
