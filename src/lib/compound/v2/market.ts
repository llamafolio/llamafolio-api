import type { BaseContext } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import type { AbiFunction } from 'abitype'

const COMPOUND_ABI = {
  getAllMarkets: {
    constant: true,
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'contract CToken[]', name: '', type: 'address[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  markets: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      {
        internalType: 'uint256',
        name: 'collateralFactorMantissa',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'isComped', type: 'bool' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    constant: true,
    inputs: [],
    name: 'underlying',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface GetMarketsContractsProps {
  comptrollerAddress: `0x${string}`
  underlyingAddressByMarketAddress?: { [key: string]: `0x${string}` }
  options?: GetMarketsContractsOptions
}

interface GetMarketsContractsOptions {
  getAllMarkets?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<`0x${string}`[]>
  getMarketsInfos?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<any>
  getUnderlyings?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<{ output: `0x${string}` }[]>
}

interface GetInfosParams {
  cTokensAddresses?: `0x${string}`[]
  getAllMarkets?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<`0x${string}`[]>
}

export async function getMarketsContracts(
  ctx: BaseContext,
  { comptrollerAddress, underlyingAddressByMarketAddress, options = {} }: GetMarketsContractsProps,
) {
  const _getAllMarkets = options?.getAllMarkets ?? getAllMarketsDefaults
  const _getMarketsInfos = options?.getMarketsInfos ?? getMarketsInfos
  const _getUnderlying = options?.getUnderlyings ?? getUnderlyings

  const [cTokensInfos, underlyingTokensAddressesRes] = await Promise.all([
    _getMarketsInfos(ctx, comptrollerAddress, { getAllMarkets: _getAllMarkets as any }),
    _getUnderlying(ctx, comptrollerAddress, { getAllMarkets: _getAllMarkets as any }),
  ])

  return cTokensInfos
    .map((cToken: any, i: number) => {
      const underlying =
        underlyingAddressByMarketAddress?.[cToken.input.params[0].toLowerCase()] ||
        underlyingTokensAddressesRes[i].output

      const collateralFactorMantissaIndex = getCollateralFactorIndex(cToken.abi)
      const collateralFactorMantissa = cToken.output[collateralFactorMantissaIndex]

      return {
        chain: ctx.chain,
        address: cToken.input.params[0],
        collateralFactor: collateralFactorMantissa,
        underlyings: [underlying],
      }
    })
    .filter(isNotNullish)
}

export async function getAllMarketsDefaults(ctx: BaseContext, comptrollerAddress: `0x${string}`) {
  return call({ ctx, target: comptrollerAddress, abi: COMPOUND_ABI.getAllMarkets })
}

export async function getMarketsInfos(
  ctx: BaseContext,
  comptrollerAddress: `0x${string}`,
  { cTokensAddresses, getAllMarkets = getAllMarketsDefaults as any }: GetInfosParams = {},
) {
  return multicall({
    ctx,
    calls: (cTokensAddresses || (await getAllMarkets(ctx, comptrollerAddress)) || []).map(
      (address) => ({ target: comptrollerAddress, params: [address] }) as const,
    ),
    abi: COMPOUND_ABI.markets,
  })
}

async function getUnderlyings(
  ctx: BaseContext,
  comptrollerAddress: `0x${string}`,
  { cTokensAddresses, getAllMarkets = getAllMarketsDefaults as any }: GetInfosParams = {},
) {
  return multicall({
    ctx,
    calls: (cTokensAddresses || (await getAllMarkets(ctx, comptrollerAddress)) || []).map((address) => ({
      target: address,
    })),
    abi: COMPOUND_ABI.underlying,
  })
}

function getCollateralFactorIndex(abiFunction: AbiFunction) {
  return abiFunction.outputs.findIndex((output) => output.name === 'collateralFactorMantissa')
}
