import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
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

export async function getHomoraBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.exchangeRateCurrent>[] = []
  for (const contract of contracts) {
    calls.push({ target: contract.cToken })
  }

  const [tokensBalances, exchangeRatesOfs] = await Promise.all([
    getBalancesOf(ctx, contracts),
    multicall({ ctx, calls, abi: abi.exchangeRateCurrent }),
  ])

  for (let balanceIdx = 0; balanceIdx < tokensBalances.length; balanceIdx++) {
    const tokensBalance = tokensBalances[balanceIdx]
    const exchangeRatesOf = exchangeRatesOfs[balanceIdx]

    if (tokensBalance.amount === 0n || !exchangeRatesOf.success) {
      continue
    }

    balances.push({
      ...tokensBalance,
      decimals: tokensBalance.underlyings?.[0].decimals,
      amount: (tokensBalance.amount * exchangeRatesOf.output) / 10n ** 18n,
      category: 'farm',
    })
  }

  return balances
}
