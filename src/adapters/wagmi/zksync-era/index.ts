import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const factory: Contract = {
  chain: 'zksync-era',
  address: '0x31be61ce896e8770b21e7a1cafa28402dd701995',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'zksync-era',
  address: '0xb2bd4db07731ba1517f3f43c4e8fe801f870b374',
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
  startDate: 1681516800,
}
