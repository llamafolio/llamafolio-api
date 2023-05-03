import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor, getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

import { getMarketsRewards } from '../common/rewards'

const WPC: Token = {
  chain: 'optimism',
  address: '0x6f620ec89b8479e97a6985792d0c64f237566746',
  decimals: 18,
  symbol: 'WPC',
}

const piggyDistribution: Contract = {
  name: 'Piggy Distribution',
  chain: 'optimism',
  address: '0x3157e0bbDc7E5DEa0f4c33a0Ad7211B9a4FF19Ee',
  underlyings: [WPC],
}

const comptroller: Contract = {
  name: 'Wepiggy Comptroller',
  chain: 'optimism',
  address: '0x896aecb9E73Bf21C50855B7874729596d0e511CB',
}

export const getContracts = async (ctx: BaseContext) => {
  const poolsMarkets = await getMarketsContracts(ctx, {
    // WePiggy Unitroller on Optimism chain
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // pETH -> wETH
      '0x8e1e582879cb8bac6283368e8ede458b63f499a5': '0x4200000000000000000000000000000000000006',
    },
  })

  return {
    contracts: {
      poolsMarkets,
      piggyDistribution,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    poolsMarkets: getMarketsBalances,
    piggyDistribution: getMarketsRewards,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
