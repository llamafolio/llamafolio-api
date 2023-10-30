import type { Balance, BalancesContext, BaseContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
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
  borrowBalanceCurrent: {
    constant: false,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'borrowBalanceCurrent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  exchangeRateCurrent: {
    constant: false,
    inputs: [],
    name: 'exchangeRateCurrent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
} as const

interface GetMarketsContractsProps {
  comptrollerAddress: `0x${string}`
  underlyingAddressByMarketAddress?: { [key: string]: `0x${string}` }
  options?: GetMarketsContractsOptions
}

interface GetInfosParams {
  cTokensAddresses?: `0x${string}`[]
  getAllMarkets?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<`0x${string}`[]>
  abi?: AbiFunction
}

interface GetMarketsContractsOptions {
  getAllMarkets?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<`0x${string}`[]>
  getMarketsInfos?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<any>
  getUnderlyings?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<any>
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
      const collateralFactorMantissa = cToken.output[collateralFactorMantissaIndex] || undefined

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
  { cTokensAddresses, getAllMarkets = getAllMarketsDefaults as any, abi = COMPOUND_ABI.markets }: GetInfosParams = {},
) {
  return multicall({
    ctx,
    calls: (cTokensAddresses || (await getAllMarkets(ctx, comptrollerAddress)) || []).map(
      (address) => ({ target: comptrollerAddress, params: [address] }) as const,
    ),
    abi,
  })
}

async function getUnderlyings(
  ctx: BaseContext,
  comptrollerAddress: `0x${string}`,
  {
    cTokensAddresses,
    getAllMarkets = getAllMarketsDefaults as any,
    abi = COMPOUND_ABI.underlying,
  }: GetInfosParams = {},
) {
  return multicall({
    ctx,
    calls: (cTokensAddresses || (await getAllMarkets(ctx, comptrollerAddress)) || []).map((address) => ({
      target: address,
    })),
    abi,
  })
}

function getCollateralFactorIndex(abiFunction: AbiFunction) {
  return abiFunction.outputs.findIndex((output) => output.name === 'collateralFactorMantissa')
}

export async function getMarketsBalances(ctx: BalancesContext, markets: Contract[]): Promise<Balance[][]> {
  const [cTokensBalances, cTokensBorrowBalanceCurrentRes, cTokensExchangeRateCurrentRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] }) as const),
      abi: COMPOUND_ABI.borrowBalanceCurrent,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address })),
      abi: COMPOUND_ABI.exchangeRateCurrent,
    }),
  ])

  return mapMultiSuccessFilter(
    cTokensBalances.map((_, i) => [
      cTokensBalances[i],
      cTokensBorrowBalanceCurrentRes[i],
      cTokensExchangeRateCurrentRes[i],
    ]),
    (res, index) => {
      const market = markets[index]
      const underlying = market.underlyings?.[0] as Contract
      const cDecimals = market.decimals // always 8
      const uDecimals = underlying.decimals
      const [{ output: lend }, { output: borrow }, { output: pricePerFullShare }] = res.inputOutputPairs

      if (!underlying || !cDecimals || !uDecimals) return null

      const fmtPricePerFullShare = pricePerFullShare / 10n ** BigInt(cDecimals + 2)
      const cTokenAmount = lend * fmtPricePerFullShare

      const lendBalance: LendBalance = {
        ...market,
        amount: cTokenAmount / 10n ** BigInt(uDecimals),
        underlyings: [{ ...underlying, amount: cTokenAmount / 10n ** BigInt(cDecimals) }],
        rewards: undefined,
        category: 'lend',
      }

      const borrowBalance: BorrowBalance = {
        ...underlying,
        amount: borrow,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return [lendBalance, borrowBalance]
    },
  ).filter(isNotNullish)
}
