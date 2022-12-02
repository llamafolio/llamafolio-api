import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { BN_TEN, sum } from '@lib/math'
import { multicall } from '@lib/multicall'
import { getPricedBalances } from '@lib/price'
import { Token } from '@lib/token'
import { isNotNullish, isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
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
}

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
): Promise<Contract[]> {
  const contracts: Contract[] = []

  const cTokensAddressesRes = await call({
    chain,
    abi: abi.getAllMarkets,
    target: comptrollerAddress,
  })
  const cTokensAddresses: string[] = cTokensAddressesRes.output

  const [marketsRes, underlyingTokensAddressesRes] = await Promise.all([
    multicall({
      chain,
      abi: abi.markets,
      calls: cTokensAddresses.map((cTokenAddress) => ({ target: comptrollerAddress, params: [cTokenAddress] })),
    }),

    multicall({
      chain,
      calls: cTokensAddresses.map((address) => ({
        target: address,
        params: [],
      })),
      abi: abi.underlying,
    }),
  ])

  for (let i = 0; i < cTokensAddresses.length; i++) {
    const cToken = cTokensAddresses[i]
    const underlying = underlyingAddressByMarketAddress[cToken.toLowerCase()] || underlyingTokensAddressesRes[i].output
    const marketRes = marketsRes[i]

    if (!isSuccess(marketRes)) {
      continue
    }

    contracts.push({
      chain,
      address: cToken,
      collateralFactor: marketRes.output.collateralFactorMantissa,
      priceSubstitute: underlying,
      underlyings: [underlying],
    })
  }

  return contracts
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
      const underlying = bal.underlyings?.[0]
      // add amount
      if (!underlying || !underlying.decimals) {
        return
      }

      const amount = bal.amount.mul(exchangeRateCurrentBycTokenAddress[bal.address]).div(BN_TEN.pow(10))

      return {
        ...bal,
        amount: BigNumber.from(amount).div(BN_TEN.pow(underlying.decimals)),
        underlyings: [{ ...underlying, amount: BigNumber.from(amount).div(BN_TEN.pow(bal.decimals)) }],
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
      const amount = BigNumber.from(res.output)

      return {
        ...cToken,
        amount,
        decimals: underlying.decimals,
        category: 'borrow',
        underlyings: [{ ...underlying, amount }],
        type: 'debt',
      }
    })
    .filter(isNotNullish)

  return [...cTokensSupplyBalances, ...cTokensBorrowBalances]
}

export async function getHealthFactor(balances: BalanceWithExtraProps[]): Promise<number | undefined> {
  const nonZerobalances = balances.filter((balance) => balance.amount.gt(0))

  const nonZeroSupplyBalances = nonZerobalances.filter((supply) => supply.category === 'lend')
  const nonZeroBorrowBalances = nonZerobalances.filter((borrow) => borrow.category === 'borrow')

  // no borrowed balance
  if (nonZeroBorrowBalances.length === 0) {
    return
  }

  const [supplyPriced, borrowPriced] = await Promise.all([
    getPricedBalances(nonZeroSupplyBalances),
    getPricedBalances(nonZeroBorrowBalances),
  ])

  const supplyUSD = sum(
    supplyPriced.map((supply: any) => (+supply.balanceUSD * supply.collateralFactor) / Math.pow(10, 18)),
  )
  const borrowUSD = sum(borrowPriced.map((borrow: any) => borrow.balanceUSD))

  const healthFactor = supplyUSD / borrowUSD

  return healthFactor > 10 ? 10 : healthFactor
}
