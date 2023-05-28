import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getERC20BalanceOf } from '@lib/erc20'
import { BN_TEN } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { BigNumber } from 'ethers'

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
    getERC20BalanceOf(ctx, contracts as Token[]),

    multicall({
      ctx,
      calls: contracts.map((token) => ({ target: token.address, params: [ctx.address] } as const)),
      abi: abi.borrowBalanceCurrent,
    }),

    multicall({
      ctx,
      calls: contracts.map((token) => ({ target: token.address })),
      abi: abi.exchangeRateCurrent,
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
      if (!underlying || !bal.decimals) {
        return
      }

      const amount = bal.amount.mul(exchangeRateCurrentBycTokenAddress[bal.address])

      return {
        ...bal,
        amount: BigNumber.from(amount).div(BN_TEN.pow(bal.decimals)),
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
      const amount = BigNumber.from(res.output)

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
