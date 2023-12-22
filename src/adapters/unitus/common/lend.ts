import type { BaseContext } from '@lib/adapter'
import { call } from '@lib/call'
import type { GetInfosParams } from '@lib/compound/v2/market'
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

export async function getAllUnitusMarkets(ctx: BaseContext, comptroller: `0x${string}`) {
  return call({ ctx, target: comptroller, abi: abi.getAlliTokens })
}

export async function getUnitusMarketsInfos(ctx: BaseContext, { comptroller, markets }: GetInfosParams) {
  return multicall({
    ctx,
    calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
    abi: abi.markets,
  })
}
