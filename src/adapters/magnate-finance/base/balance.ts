import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
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

export async function getMagnateMarketsBalances(ctx: BalancesContext, markets: Contract[]): Promise<Balance[]> {
  const [cTokensSuppliesBalancesRes, cTokensBorrowsBalancesRes, cTokensExchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((token) => ({ target: token.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: markets.map((token) => ({ target: token.address, params: [ctx.address] }) as const),
      abi: abi.borrowBalanceCurrent,
    }),
    multicall({
      ctx,
      calls: markets.map((token) => ({ target: token.address })),
      abi: abi.exchangeRateCurrent,
    }),
  ])

  markets.forEach((market, index) => {
    const cTokensExchangeRates = cTokensExchangeRatesRes[index].success
      ? cTokensExchangeRatesRes[index].output
      : 1n * BigInt(Math.pow(10, 10))

    market.exchangeRate = cTokensExchangeRates
  })

  const lendBalances: Balance[] = mapSuccessFilter(cTokensSuppliesBalancesRes, (res, index) => {
    const market = markets[index]
    const underlyings = market.underlyings as Contract[]
    const amount = (res.output * market.exchangeRate) / 10n ** 18n

    return {
      ...market,
      amount,
      underlyings,
      rewards: undefined,
      category: 'lend',
    }
  })

  const borrowBalances: Balance[] = mapSuccessFilter(cTokensBorrowsBalancesRes, (res, index) => {
    const market = markets[index]
    const underlyings = market.underlyings as Contract[]

    return {
      ...market,
      amount: res.output,
      underlyings,
      rewards: undefined,
      category: 'borrow',
    }
  })

  return [...lendBalances, ...borrowBalances]
}
