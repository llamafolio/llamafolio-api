import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { multicall } from '@lib/multicall'

const abi = {
  markets: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      { internalType: 'bool', name: 'autoCollaterize', type: 'bool' },
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const comptroller: Contract = {
  chain: 'polygon',
  address: '0x5b7136cffd40eee5b882678a5d02aa25a48d669f',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // kMatic -> Matic
      '0x7854d4cfa7d0b877e399bcbdffb49536d7a14fc7': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
    getMarketsInfos: (ctx, { markets, comptroller }) =>
      multicall({
        ctx,
        calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
        abi: abi.markets,
      }),
  })

  return {
    contracts: { markets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1700611200,
                  }
                  