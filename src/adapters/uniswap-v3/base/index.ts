import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from '../common/pools'

// https://docs.uniswap.org/contracts/v3/reference/deployments
const factory: Contract = {
  chain: 'base',
  address: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
}

const nonFungiblePositionManager: Contract = {
  chain: 'base',
  address: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
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
