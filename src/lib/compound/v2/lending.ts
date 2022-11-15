import { Chain, providers } from '@defillama/sdk/build/general'
import { Balance, BaseContext, Contract, PricedBalance } from '@lib/adapter'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { BN_TEN, sum } from '@lib/math'
import { multicall } from '@lib/multicall'
import { getPricedBalances } from '@lib/price'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { BigNumber, ethers, utils } from 'ethers'

import ComptrollerABI from './abis/Comptroller.json'

export interface GetMarketsContractsProps {
  comptrollerAddress: string
  /**
   * map of underlying tokens by address not defined in Comptroller markets (ex: cETH -> WETH).
   */
  underlyingAddressByMarketAddress?: { [key: string]: string }
}

export interface BalanceWithExtraProps extends Balance {
  collateralFactor: BigNumber
}

export async function getMarketsContracts(
  chain: Chain,
  { comptrollerAddress, underlyingAddressByMarketAddress = {} }: GetMarketsContractsProps,
) {
  const provider = providers[chain]

  const comptroller = new ethers.Contract(comptrollerAddress, ComptrollerABI, provider)

  const cTokensAddresses: string[] = await comptroller.getAllMarkets()

  const collateralsFactors: any[] = []

  for (const cTokensAddress of cTokensAddresses) {
    collateralsFactors.push(await comptroller.markets(cTokensAddress))
  }

  const [cTokens, underlyingTokensAddressesRes] = await Promise.all([
    getERC20Details(chain, cTokensAddresses),

    multicall({
      chain,
      calls: cTokensAddresses.map((address) => ({
        target: address,
        params: [],
      })),
      abi: {
        constant: true,
        inputs: [],
        name: 'underlying',
        outputs: [{ name: '', type: 'address' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const underlyingTokensAddresses: string[] = underlyingTokensAddressesRes
    .filter((res) => res.success)
    .map((res) => res.output)

  if (underlyingAddressByMarketAddress) {
    for (const marketAddress in underlyingAddressByMarketAddress) {
      const underlyingAddress = underlyingAddressByMarketAddress[marketAddress]
      underlyingTokensAddresses.push(underlyingAddress)
    }
  }

  const underlyingTokens = await getERC20Details(chain, underlyingTokensAddresses)
  const underlyingTokenByAddress: { [key: string]: Token } = {}
  for (const underlyingToken of underlyingTokens) {
    underlyingToken.address = underlyingToken.address.toLowerCase()
    underlyingTokenByAddress[underlyingToken.address] = underlyingToken
  }

  return cTokens
    .map((token, i) => {
      const underlyingTokenAddress =
        underlyingAddressByMarketAddress?.[token.address?.toLowerCase()] ||
        underlyingTokensAddressesRes[i].output?.toLowerCase()
      const underlyingToken = underlyingTokenByAddress[underlyingTokenAddress]

      if (!underlyingToken) {
        console.log('Failed to get underlying token for market', token)
        return null
      }

      return {
        ...token,
        collateralFactor: collateralsFactors[i].collateralFactorMantissa,
        priceSubstitute: underlyingToken.address,
        underlyings: [underlyingToken],
      }
    })
    .filter(isNotNullish)
}

export async function getMarketsBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]): Promise<Balance[]> {
  const cTokenByAddress: { [key: string]: Contract } = {}
  for (const contract of contracts) {
    cTokenByAddress[contract.address] = contract
  }

  const [cTokensBalances, cTokensBorrowBalanceCurrentRes, cTokensExchangeRateCurrentRes] = await Promise.all([
    getERC20BalanceOf(ctx, chain, contracts as Token[]),

    multicall({
      chain,
      calls: contracts.map((token) => ({
        target: token.address,
        params: [ctx.address],
      })),
      abi: {
        constant: false,
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'borrowBalanceCurrent',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls: contracts.map((token) => ({
        target: token.address,
        params: [],
      })),
      abi: {
        constant: false,
        inputs: [],
        name: 'exchangeRateCurrent',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    }),
  ])

  const exchangeRateCurrentBycTokenAddress: { [key: string]: BigNumber } = {}
  for (const res of cTokensExchangeRateCurrentRes) {
    if (!res.success) {
      continue
    }

    exchangeRateCurrentBycTokenAddress[res.input.target] = BigNumber.from(res.output)
  }

  const cTokensSupplyBalances = cTokensBalances
    .filter((bal) => exchangeRateCurrentBycTokenAddress[bal.address] && bal.underlyings?.[0])
    .map((bal) => {
      // add amount
      if (!bal.underlyings?.[0] || !bal.underlyings?.[0].decimals) {
        return
      }
      const amount = bal.amount
        .mul(exchangeRateCurrentBycTokenAddress[bal.address])
        .div(BN_TEN.pow(bal.underlyings[0].decimals + 10))
      bal.underlyings[0].amount = amount

      return {
        ...bal,
        amount,
        underlyings: [{ ...bal.underlyings[0], decimals: bal.decimals }],
        category: 'lend',
      }
    })

  const cTokensBorrowBalances = cTokensBorrowBalanceCurrentRes
    .filter((res) => res.success)
    .map((res) => {
      const cToken: any = cTokenByAddress[res.input.target]
      if (!cToken || !cToken.underlyings?.[0]) {
        return null
      }

      // add amount
      const amount = BigNumber.from(res.output)
      cToken.underlyings[0].amount = amount

      return {
        ...cToken,
        amount,
        decimals: cToken.underlyings[0].decimals,
        category: 'borrow',
        type: 'debt',
      }
    })
    .filter(isNotNullish)

  return [...cTokensSupplyBalances, ...cTokensBorrowBalances]
}

export async function getHealthFactor(balances: BalanceWithExtraProps[]) {
  const nonNullContracts = balances.filter((balance) => balance.amount.gt(0))

  const lends: BalanceWithExtraProps[] = nonNullContracts.filter((lend) => lend.category === 'lend')
  const borrows = nonNullContracts.filter((borrow) => borrow.category === 'borrow')

  for (const lend of lends) {
    const formattedBalanceWithCollateralFactor = lend.amount.mul(lend.collateralFactor).div(utils.parseEther('1.0'))
    lend.underlyings
      ? (lend.underlyings[0].amount = formattedBalanceWithCollateralFactor)
      : (lend.amount = formattedBalanceWithCollateralFactor)
  }

  const lendsBalancesInUSD: number[] = []
  const borrowsBalancesInUSD: number[] = []
  const pricedLendsBalances: any = await getPricedBalances(lends)
  const pricedBorrowsBalances: any = await getPricedBalances(borrows)
  pricedLendsBalances.map((price: PricedBalance) => lendsBalancesInUSD.push(price.balanceUSD))
  pricedBorrowsBalances.map((price: PricedBalance) => borrowsBalancesInUSD.push(price.balanceUSD))

  const totalLendsBalances = sum(lendsBalancesInUSD)
  const totalBorrowsBalances = sum(borrowsBalancesInUSD)

  const healthFactor = totalBorrowsBalances > 0 ? totalLendsBalances / totalBorrowsBalances : totalLendsBalances

  return healthFactor
}
