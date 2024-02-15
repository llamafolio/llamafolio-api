import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  balancesPub: {
    inputs: [],
    name: 'balancesPub',
    outputs: [
      { internalType: 'uint256', name: 'b0', type: 'uint256' },
      { internalType: 'uint256', name: 'b1', type: 'uint256' },
      { internalType: 'uint112', name: 'r0', type: 'uint112' },
      { internalType: 'uint112', name: 'r1', type: 'uint112' },
      { internalType: 'uint256', name: 'out0', type: 'uint256' },
      { internalType: 'uint256', name: 'out1', type: 'uint256' },
      { internalType: 'uint256', name: 'loans', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getRhinoLpBalances(ctx: BalancesContext, lps: Contract[]): Promise<Balance[]> {
  const [shareBalances, reserves, totalSupplies] = await Promise.all([
    multicall({
      ctx,
      calls: lps.map((lp) => ({ target: lp.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: lps.map((lp) => ({ target: lp.address }) as const), abi: abi.balancesPub }),
    multicall({ ctx, calls: lps.map((lp) => ({ target: lp.address }) as const), abi: erc20Abi.totalSupply }),
  ])

  return mapMultiSuccessFilter(
    shareBalances.map((_, i) => [shareBalances[i], reserves[i], totalSupplies[i]]),
    (res, index) => {
      const lp = lps[index]
      const underlyings = lp.underlyings as Contract[]
      if (!underlyings) return null
      const [{ output: amount }, { output: reserves }, { output: supply }] = res.inputOutputPairs

      underlyings.forEach((underlying, underlyingIdx) => {
        underlying.amount = (reserves[underlyingIdx] * amount) / supply
      })

      return {
        ...lp,
        amount,
        underlyings,
        rewards: undefined,
        category: 'lp',
      }
    },
  )
}
