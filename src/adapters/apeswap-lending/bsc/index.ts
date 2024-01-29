import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { multicall } from '@lib/multicall'

const abi = {
  markets: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidationFactorMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidationIncentiveMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'activeCollateralUSDCap', type: 'uint256' },
      { internalType: 'uint256', name: 'activeCollateralCTokenUsage', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    // Apeswap Unitroller
    comptrollerAddress: '0xad48b2c9dc6709a560018c678e918253a65df86e',
    underlyingAddressByMarketAddress: {
      // oBNB -> BNB
      '0x34878f6a484005aa90e7188a546ea9e52b538f6f': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
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
                    startDate: 1658966400,
                  }
                  