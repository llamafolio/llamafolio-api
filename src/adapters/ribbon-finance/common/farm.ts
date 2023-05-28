import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_TEN } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFarmBalances(ctx: BalancesContext, gauges: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const gaugeCalls: Call<typeof erc20Abi.balanceOf>[] = gauges.map((gauge) => ({
    target: gauge.address,
    params: [ctx.address],
  }))

  const lpCalls: Call<typeof abi.pricePerShare>[] = gauges.map((gauge) => ({ target: gauge.lpToken }))

  const [balancesOfRes, pricePerSharesRes] = await Promise.all([
    multicall({ ctx, calls: gaugeCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: lpCalls, abi: abi.pricePerShare }),
  ])

  for (let gaugeIdx = 0; gaugeIdx < gauges.length; gaugeIdx++) {
    const gauge = gauges[gaugeIdx]
    const pricePerShare = pricePerSharesRes[gaugeIdx]
    const balanceOf = balancesOfRes[gaugeIdx]
    const underlying = gauge.underlyings?.[0] as Contract

    if (!pricePerShare.success || !balanceOf.success) {
      continue
    }

    const amount = BigNumber.from(balanceOf.output)

    if (underlying && underlying.decimals) {
      const balance: Balance = {
        ...gauge,
        decimals: underlying.decimals,
        underlyings: [{ ...underlying, amount: amount.mul(pricePerShare.output).div(BN_TEN.pow(underlying.decimals)) }],
        amount: amount,
        rewards: undefined,
        category: 'farm',
      }

      balances.push(balance)
    }
  }

  return balances
}
