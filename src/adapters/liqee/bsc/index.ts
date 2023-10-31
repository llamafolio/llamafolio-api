import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
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
  chain: 'bsc',
  address: '0x6d290f45A280A688Ff58d095de480364069af110',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
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
