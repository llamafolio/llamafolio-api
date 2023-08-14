import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

// https://docs.uniswap.org/contracts/v3/reference/deployments
export const factory: Contract = {
  chain: 'ethereum',
  address: '0x91e1b99072f238352f59e58de875691e20dc19c1',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'ethereum',
  address: '0x8aac493fd8c78536ef193882aeffeaa3e0b8b5c5',
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

  console.log(balances[10].underlyings)

  return {
    groups: [{ balances }],
  }
}
