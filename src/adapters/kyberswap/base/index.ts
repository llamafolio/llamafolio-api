import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const factory: Contract = {
  chain: 'base',
  address: '0xc7a590291e07b9fe9e64b86c58fd8fc764308c4a',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'base',
  address: '0xe222fbe074a436145b255442d919e4e3a6c6a480',
}

export const getContracts = async () => {
  return {
    contracts: { nonFungiblePositionManager },
    revalidate: 60 * 60,
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
  startDate: 1630800000,
}
