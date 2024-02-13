import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const factory: Contract = {
  chain: 'ethereum',
  address: '0xB9a14EE1cd3417f3AcC988F61650895151abde24',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'ethereum',
  address: '0xd74c1d4659d6cef276ccb3792e69945e5c07fedb',
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
  startDate: 1701734400,
}
