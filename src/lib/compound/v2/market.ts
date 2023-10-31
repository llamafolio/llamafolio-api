import type { Balance, BalancesContext, BaseContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

export const COMPOUND_ABI = {
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
  getAllMarkets?: (ctx: BaseContext, comptrollerAddress: `0x${string}`) => Promise<any>
  getMarketsInfos?: (ctx: BaseContext, params: GetInfosParams) => Promise<any>
  getUnderlyings?: (ctx: BaseContext, params: GetInfosParams) => Promise<any>
  getCollateralFactor?: (params: GetCollateralFactorParams) => Promise<any>
}

interface GetInfosParams {
  comptroller: `0x${string}`
  markets: readonly `0x${string}`[]
}

interface GetCollateralFactorParams {
  market: `0x${string}`
  marketInfo: any
}

export async function getMarketsContracts(ctx: BaseContext, options: GetMarketsContractsProps) {
  const _getAllMarkets = options.getAllMarkets || getAllMarkets
  const _getMarketsInfos = options.getMarketsInfos || getMarketsInfos
  const _getUnderlying = options.getUnderlyings || getUnderlyings
  const _getCollateralFactor = options.getCollateralFactor || getCollateralFactor

  const markets = await _getAllMarkets(ctx, options.comptrollerAddress)

  const [cTokensInfos, underlyingTokensAddressesRes] = await Promise.all([
    _getMarketsInfos(ctx, { comptroller: options.comptrollerAddress, markets }),
    _getUnderlying(ctx, { comptroller: options.comptrollerAddress, markets }),
  ])

  return cTokensInfos
    .map((cToken: any, i: number) => {
      const underlying =
        options.underlyingAddressByMarketAddress?.[cToken.input.params[0].toLowerCase()] ||
        underlyingTokensAddressesRes[i].output

      const collateralFactor = _getCollateralFactor({ market: markets[i], marketInfo: cToken.output })

      return {
        chain: ctx.chain,
        address: cToken.input.params[0],
        collateralFactor,
        underlyings: [underlying],
      }
    })
    .filter(isNotNullish)
}

export async function getAllMarkets(ctx: BaseContext, comptroller: `0x${string}`) {
  return call({ ctx, target: comptroller, abi: COMPOUND_ABI.getAllMarkets })
}

export async function getMarketsInfos(ctx: BaseContext, { comptroller, markets }: GetInfosParams) {
  return multicall({
    ctx,
    calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
    abi: COMPOUND_ABI.markets,
  })
}

async function getUnderlyings(ctx: BaseContext, { markets }: GetInfosParams) {
  return multicall({ ctx, calls: markets.map((address) => ({ target: address })), abi: COMPOUND_ABI.underlying })
}

function getCollateralFactor({ marketInfo }: GetCollateralFactorParams) {
  return marketInfo[1]
}

export async function getMarketsBalances(ctx: BalancesContext, markets: Contract[]) {
  const balances: Balance[] = []

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

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i]
    const underlying = market.underlyings?.[0] as Contract
    const rewards = market.rewards as Balance[]
    const cDecimals = 8 // cDecimals are always 8
    const uDecimals = underlying.decimals
    const lendRes = cTokensBalances[i]
    const borrowRes = cTokensBorrowBalanceCurrentRes[i]
    const pricePerFullShareRes = cTokensExchangeRateCurrentRes[i]

    if (!underlying || !cDecimals || !uDecimals) {
      continue
    }

    if (lendRes.success && pricePerFullShareRes.success) {
      const fmtPricePerFullShare = pricePerFullShareRes.output / 10n ** BigInt(cDecimals + 2)
      const cTokenAmount = lendRes.output * fmtPricePerFullShare

      const lendBalance: LendBalance = {
        ...market,
        amount: cTokenAmount / 10n ** BigInt(uDecimals),
        underlyings: [{ ...underlying, amount: cTokenAmount / 10n ** BigInt(cDecimals) }],
        rewards,
        category: 'lend',
      }
      balances.push(lendBalance)
    }

    if (borrowRes.success) {
      const borrowBalance: BorrowBalance = {
        ...underlying,
        amount: borrowRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }
      balances.push(borrowBalance)
    }
  }

  return balances
}
