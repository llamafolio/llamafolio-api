import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { BN_TEN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

import ComptrollerABI from './abis/Comptroller.json'

export interface GetMarketsContractsProps {
  comptrollerAddress: string
  /**
   * map of underlying tokens by address not defined in Comptroller markets (ex: cETH -> WETH).
   */
  underlyingAddressByMarketAddress?: { [key: string]: string }
}

export async function getMarketsContracts(
  chain: Chain,
  { comptrollerAddress, underlyingAddressByMarketAddress = {} }: GetMarketsContractsProps,
) {
  const provider = providers[chain]

  const comptroller = new ethers.Contract(comptrollerAddress, ComptrollerABI, provider)

  const cTokensAddresses: string[] = await comptroller.getAllMarkets()

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
    getERC20BalanceOf(ctx, chain, contracts),

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
      const cToken = cTokenByAddress[res.input.target]
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
