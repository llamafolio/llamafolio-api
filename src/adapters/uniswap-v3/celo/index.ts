import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from '../common/pools'

// https://docs.uniswap.org/contracts/v3/reference/deployments
const factory: Contract = {
  chain: 'celo',
  address: '0xAfE208a311B21f13EF87E33A90049fC17A7acDEc',
}

const nonFungiblePositionManager: Contract = {
  chain: 'celo',
  address: '0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A',
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
