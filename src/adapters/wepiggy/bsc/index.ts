import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor, getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'

import { getMarketsRewards } from '../common/rewards'

const WPC: Token = {
  chain: 'bsc',
  address: '0x6f620ec89b8479e97a6985792d0c64f237566746',
  decimals: 18,
  symbol: 'WPC',
}

const piggyDistribution: Contract = {
  name: 'Piggy Distribution',
  chain: 'bsc',
  address: '0xE6320460Aca9E4A4385058EEfD7D4D70123fC9c9',
  underlyings: [WPC],
}

const comptroller: Contract = {
  name: 'Wepiggy Comptroller',
  chain: 'bsc',
  address: '0x8c925623708A94c7DE98a8e83e8200259fF716E0',
}

export const getContracts = async (ctx: BaseContext) => {
  const poolsMarkets = await getMarketsContracts(ctx, {
    // WePiggy Unitroller on BSC chain
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // pBNB -> wBNB
      '0x33a32f0ad4aa704e28c93ed8ffa61d50d51622a7': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
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
