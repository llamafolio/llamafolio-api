import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { BN_TEN } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
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

  const exchangeRatesOfs = await multicall({ ctx, calls, abi: abi.exchangeRateCurrent })

  for (let balanceIdx = 0; balanceIdx < contracts.length; balanceIdx++) {
    const tokensBalance = contracts[balanceIdx] as Balance
    const exchangeRatesOf = exchangeRatesOfs[balanceIdx]

    if (!isSuccess(exchangeRatesOf)) {
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
