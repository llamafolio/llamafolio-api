import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import type { AbiFunction } from 'abitype'

const COMPOUND_ABI = {
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

const cTOKENS_DECIMALS = 8

interface CompoundAbi {
  getAllMarketsAbi?: AbiFunction
  getMarketsInfoAbi?: AbiFunction
  getUnderlyingAbi?: AbiFunction
}

export interface GetMarketsContractsProps {
  comptrollerAddress: `0x${string}`
  /**
   * map of underlying tokens by address not defined in Comptroller markets (ex: cETH -> WETH).
   */
  underlyingAddressByMarketAddress?: { [key: string]: `0x${string}` }
}

export type BalanceWithExtraProps = Balance & {
  collateralFactor: bigint
}

export async function getMarketsContracts(
  ctx: BaseContext,
  { comptrollerAddress, underlyingAddressByMarketAddress = {} }: GetMarketsContractsProps,
  abis: CompoundAbi = {},
): Promise<Contract[]> {
  const {
    getAllMarketsAbi = COMPOUND_ABI.getAllMarkets,
    getMarketsInfoAbi = COMPOUND_ABI.markets,
    getUnderlyingAbi = COMPOUND_ABI.underlying,
  } = abis

  const cTokensAddresses = await getAllMarkets(ctx, comptrollerAddress, getAllMarketsAbi)

  if (!Array.isArray(cTokensAddresses) || cTokensAddresses.length === 0) return []

  const collateralFactorIndex = getCollateralFactorIndex(getMarketsInfoAbi)

  if (collateralFactorIndex === -1) return []

  const [marketsInfosRes, underlyingTokensAddressesRes] = await Promise.all([
    getMarketsInfos(ctx, comptrollerAddress, cTokensAddresses, getMarketsInfoAbi),
    getUnderlying(ctx, cTokensAddresses, getUnderlyingAbi),
  ])

  return cTokensAddresses
    .map((cToken, i) => {
      const underlying =
        underlyingAddressByMarketAddress[cToken.toLowerCase()] || underlyingTokensAddressesRes[i].output
      const marketRes = marketsInfosRes[i] as any

      if (!marketRes.success) return null

      const collateralFactorMantissa = marketRes.output[collateralFactorIndex]

      return {
        chain: ctx.chain,
        address: cToken,
        collateralFactor: collateralFactorMantissa,
        underlyings: [underlying],
      }
    })
    .filter(isNotNullish)
}

function getCollateralFactorIndex(abiFunction: AbiFunction) {
  return abiFunction.outputs.findIndex((output) => output.name === 'collateralFactorMantissa')
}

export async function getAllMarkets(ctx: BaseContext, comptrollerAddress: `0x${string}`, abi: AbiFunction) {
  return call({ ctx, target: comptrollerAddress, abi })
}

export async function getMarketsInfos(
  ctx: BaseContext,
  comptrollerAddress: `0x${string}`,
  marketsAddresses: Contract[],
  abi: AbiFunction,
) {
  return multicall({
    ctx,
    calls: marketsAddresses.map((marketAddress) => ({ target: comptrollerAddress, params: [marketAddress] })),
    abi,
  } as const)
}

async function getUnderlying(ctx: BaseContext, cTokensAddresses: `0x${string}`[], abi: AbiFunction) {
  return multicall({
    ctx,
    calls: cTokensAddresses.map((address) => ({ target: address })),
    abi,
  } as const)
}

export async function getMarketsBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const cTokenByAddress: { [key: string]: Contract } = {}
  for (const contract of contracts) {
    cTokenByAddress[contract.address] = contract
  }

  const [cTokensBalances, cTokensBorrowBalanceCurrentRes, cTokensExchangeRateCurrentRes] = await Promise.all([
    getBalancesOf(ctx, contracts),

    multicall({
      ctx,
      calls: contracts.map((token) => ({ target: token.address, params: [ctx.address] }) as const),
      abi: COMPOUND_ABI.borrowBalanceCurrent,
    }),

    multicall({
      ctx,
      calls: contracts.map((token) => ({ target: token.address })),
      abi: COMPOUND_ABI.exchangeRateCurrent,
    }),
  ])

  const exchangeRateCurrentBycTokenAddress: { [key: string]: bigint } = {}
  for (const res of cTokensExchangeRateCurrentRes) {
    if (!res.success) {
      continue
    }

    exchangeRateCurrentBycTokenAddress[res.input.target] = res.output
  }

  const cTokensSupplyBalances = cTokensBalances
    .filter((bal) => exchangeRateCurrentBycTokenAddress[bal.address] && bal.underlyings?.[0])
    .map((bal) => {
      const underlying = bal.underlyings?.[0]
      // add amount
      if (!underlying || !underlying.decimals) {
        return
      }

      const amount =
        (bal.amount * exchangeRateCurrentBycTokenAddress[bal.address]) / 10n ** BigInt(cTOKENS_DECIMALS + 2) // cTokens are always 8 decimals and its a percentage so 10 ** 8 * 100 -> 10 ** (8 + 2)

      return {
        ...bal,
        amount: amount / 10n ** BigInt(underlying.decimals || 0),
        underlyings: [{ ...underlying, amount: amount / 10n ** BigInt(bal.decimals || 0) }],
        category: 'lend',
      }
    })

  const cTokensBorrowBalances = cTokensBorrowBalanceCurrentRes
    .filter((res) => res.success)
    .map((res) => {
      const cToken: any = cTokenByAddress[res.input.target]
      const underlying = cToken?.underlyings?.[0]
      if (!cToken || !underlying) {
        return null
      }

      // add amount
      const amount = res.output

      return {
        ...cToken,
        amount,
        decimals: underlying.decimals,
        category: 'borrow',
        underlyings: [{ ...underlying, amount }],
      }
    })
    .filter(isNotNullish)

  return [...cTokensSupplyBalances, ...cTokensBorrowBalances]
}
