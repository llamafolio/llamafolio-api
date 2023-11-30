import type { BaseContext } from '@lib/adapter'
import { call } from '@lib/call'
import type { GetCollateralFactorParams, GetInfosParams } from '@lib/compound/v2/market'
import { multicall } from '@lib/multicall'

const abi = {
  allMarkets: {
    inputs: [],
    name: 'allMarkets',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  marketInfos: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'marketInfos',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      { internalType: 'uint256', name: 'supplyCap', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowCap', type: 'uint256' },
      { internalType: 'uint256', name: 'collateralFactor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLayerBankAllMarkets(ctx: BaseContext, comptroller: `0x${string}`) {
  return call({ ctx, target: comptroller, abi: abi.allMarkets })
}

export async function getLayerBankMarketsInfos(ctx: BaseContext, { comptroller, markets }: GetInfosParams) {
  return multicall({
    ctx,
    calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
    abi: abi.marketInfos,
  })
}

export async function getCollateralFactor({ marketInfo }: GetCollateralFactorParams) {
  return marketInfo[3]
}
