import { Adapter, GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { ethers } from 'ethers'

const getContracts = async () => {
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
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { markets }) => {
  const balances = await getMarketsBalances(ctx, 'avax', markets || [])

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'benqi-lending',
  getContracts,
  getBalances,
}

export default adapter
