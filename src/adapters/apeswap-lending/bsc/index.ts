import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'
import { ethers } from 'ethers'

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    // Apeswap Unitroller
    comptrollerAddress: '0xad48b2c9dc6709a560018c678e918253a65df86e',
    underlyingAddressByMarketAddress: {
      // oBNB -> BNB
      '0x34878f6a484005aa90e7188a546ea9e52b538f6f': ethers.constants.AddressZero,
    },
  })

  return {
    contracts: { markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
