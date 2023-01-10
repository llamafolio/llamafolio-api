import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_TEN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const RBN: Token = {
  chain: 'ethereum',
  address: '0x6123B0049F904d730dB3C36a31167D9d4121fA6B',
  decimals: 18,
  symbol: 'RBN',
}

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getFarmBalances(ctx: BalancesContext, gauges: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const gaugeCalls = gauges.map((gauge) => ({
    target: gauge.address,
    params: [ctx.address],
  }))

  const lpCalls = gauges.map((gauge) => ({
    target: gauge.lpToken,
    params: [],
  }))

  const [balancesOfRes, pricePerShareRes] = await Promise.all([
    multicall({ ctx, calls: gaugeCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: lpCalls, abi: abi.pricePerShare }),
  ])

  const balancesOf = balancesOfRes.filter(isSuccess).map((res) => BigNumber.from(res.output))
  const pricePerShares = pricePerShareRes.filter(isSuccess).map((res) => res.output)

  for (let i = 0; i < gauges.length; i++) {
    const gauge = gauges[i]
    const pricePerShare = pricePerShares[i]
    const balanceOf = balancesOf[i]
    const underlyings = gauge.underlyings?.[0] as Contract

    if (underlyings.decimals) {
      const balance: Balance = {
        ...gauge,
        decimals: underlyings.decimals,
        underlyings: [{ ...underlyings, amount: balanceOf.mul(pricePerShare).div(BN_TEN.pow(underlyings.decimals)) }],
        amount: balanceOf,
        rewards: undefined,
        category: 'farm',
      }

      if (balance.amount.gt(0)) {
        console.log(balance)
      }

      balances.push(balance)
    }
  }

  return balances
}
