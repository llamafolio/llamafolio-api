import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getERC20BalanceOf } from '@lib/erc20'
import { BN_TEN, isZero } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'

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
}

export async function getHomoraBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = []
  for (const contract of contracts) {
    calls.push({ target: contract.cToken })
  }

  const [tokensBalances, exchangeRatesOfs] = await Promise.all([
    getERC20BalanceOf(ctx, contracts as Token[]),
    multicall({ ctx, calls, abi: abi.exchangeRateCurrent }),
  ])

  for (let balanceIdx = 0; balanceIdx < tokensBalances.length; balanceIdx++) {
    const tokensBalance = tokensBalances[balanceIdx]
    const exchangeRatesOf = exchangeRatesOfs[balanceIdx]

    if (isZero(tokensBalance.amount) || !isSuccess(exchangeRatesOf)) {
      continue
    }

    balances.push({
      ...tokensBalance,
      decimals: tokensBalance.underlyings?.[0].decimals,
      amount: tokensBalance.amount.mul(exchangeRatesOf.output).div(BN_TEN.pow(18)),
      category: 'farm',
    })
  }

  return balances
}
