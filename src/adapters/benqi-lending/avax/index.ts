import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'
import { ethers } from 'ethers'

export const getContracts = async () => {
  const markets = await getMarketsContracts('avax', {
    // Benqi Comptroller
    comptrollerAddress: '0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4',
    underlyingAddressByMarketAddress: {
      // qiAVAX -> AVAX
      '0x5c0401e81bc07ca70fad469b451682c0d747ef1c': ethers.constants.AddressZero,
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
    balances,
    healthFactor,
  }
}
