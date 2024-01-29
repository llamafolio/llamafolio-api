import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { call } from '@lib/call'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { multicall } from '@lib/multicall'

const abi = {
  getAlliTokens: {
    inputs: [],
    name: 'getAlliTokens',
    outputs: [{ internalType: 'address[]', name: '_alliTokens', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  markets: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowFactorMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowCapacity', type: 'uint256' },
      { internalType: 'uint256', name: 'supplyCapacity', type: 'uint256' },
      { internalType: 'bool', name: 'mintPaused', type: 'bool' },
      { internalType: 'bool', name: 'redeemPaused', type: 'bool' },
      { internalType: 'bool', name: 'borrowPaused', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x8f1f15DCf4c70873fAF1707973f6029DEc4164b3',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // qETH -> WETH
      '0x9c02b8409a2cd04dfda7b824235625f9c7dfb0e2': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    },
    getAllMarkets: (ctx, comptroller) =>
      call({
        ctx,
        target: comptroller,
        abi: abi.getAlliTokens,
      }),
    getMarketsInfos: (ctx, { markets, comptroller }) =>
      multicall({
        ctx,
        calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
        abi: abi.markets,
      }),
    getCollateralFactor: ({ marketInfo }) => {
      return marketInfo[0]
    },
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
                    startDate: 1632096000,
                  }
                  