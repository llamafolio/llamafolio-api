import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
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
  address: '0x8849f1a0cb6b5d6076ab150546eddee193754f1c',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // oMatic -> Matic
      '0xe554e874c9c60e45f1debd479389c76230ae25a8': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
      // oDAI -> DAI
      '0x6f063fe661d922e4fd77227f8579cb84f9f41f0b': '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
      // oGHST -> GHST
      '0xe053a4014b50666ed388ab8cbb18d5834de0ab12': '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7',
    },
    getMarketsInfos: (ctx, { markets, comptroller }) =>
      multicall({
        ctx,
        calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
        abi: abi.markets,
      }),
    getCollateralFactor: ({ marketInfo }) => {
      return marketInfo[2]
    },
  })

  return {
    contracts: {
      markets,
      comptroller,
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
