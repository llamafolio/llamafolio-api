import { getLendingRewardsBalances } from '@adapters/aave/v2/common/rewards'
import { getLendingPoolBalances, getLendingPoolContracts, getLendingPoolHealthFactor } from '@lib/aave/v2/lending'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  name: 'Lending Pool',
  address: '0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf',
  chain: 'polygon',
}

const WMATIC: Contract = {
  address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  chain: 'polygon',
  name: 'Wrapped Matic',
  symbol: 'WMATIC',
  decimals: 18,
  coingeckoId: 'wmatic',
}

const incentiveController: Contract = {
  name: 'Aave Incentive Controller',
  address: '0x357D51124f59836DeD84c8a1730D72B749d8BC23',
  chain: 'polygon',
}

export const getContracts = async () => {
  const pools = await getLendingPoolContracts('polygon', lendingPool)

  return {
    contracts: {
      pools,
      incentiveController,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'polygon', contracts, {
    pools: getLendingPoolBalances,
    incentiveController: (...args) => getLendingRewardsBalances(...args, WMATIC, contracts.pools || []),
  })

  const healthFactor = await getLendingPoolHealthFactor(ctx, 'polygon', lendingPool)

  return {
    balances,
    polygon: {
      healthFactor,
    },
  }
}
