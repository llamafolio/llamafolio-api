import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from '../common/pools'

// https://docs.uniswap.org/contracts/v3/reference/deployments
const factory: Contract = {
  chain: 'base',
  address: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
}

const nonFungiblePositionManager: Contract = {
  chain: 'base',
  address: '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613',
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
