import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

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
      abi: abi.borrowBalanceCurrent,
    }),

    multicall({
      ctx,
      calls: contracts.map((token) => ({ target: token.address })),
      abi: abi.exchangeRateCurrent,
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
      if (!underlying || !bal.decimals) {
        return
      }

      const amount = bal.amount * exchangeRateCurrentBycTokenAddress[bal.address]

      return {
        ...bal,
        amount: amount / 10n ** BigInt(bal.decimals || 0),
        decimals: bal.decimals,
        underlyings: [underlying],
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
        decimals: cToken.decimals,
        category: 'borrow',
        underlyings: [underlying],
      }
    })
    .filter(isNotNullish)

  return [...cTokensSupplyBalances, ...cTokensBorrowBalances]
}
