import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
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

const comptroller: Contract = {
  chain: 'bsc',
  address: '0x87363D74CD88A6220926Cf64bDEFd23ae63BE115',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // oBNB -> BNB
      '0x32c13d51188afd2d882b5de6447387dc8b528a59': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    },
    getMarketsInfos: (ctx, { markets, comptroller }) =>
      multicall({
        ctx,
        calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
        abi: abi.markets,
      }),
  })

  return {
    contracts: {
      markets,
    },
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
