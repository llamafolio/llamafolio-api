import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const factory: Contract = {
  chain: 'ethereum',
  address: '0xe777c3da43ec554ec845649323215afaa34d6c23',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'ethereum',
  address: '0xdC6F8E434a7E0db46D416b6959d8175DAFa5be53',
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
  startDate: 1707868800,
}
