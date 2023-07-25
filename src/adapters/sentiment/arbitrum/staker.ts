import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccess, mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSentimentStakerBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const fmtBalancesRes = await multicall({
    ctx,
    calls: mapSuccess(
      userBalancesRes,
      (balance) => ({ target: balance.input.target, params: [balance.output] }) as const,
    ),
    abi: abi.convertToAssets,
  })

  const balances: Balance[] = mapSuccessFilter(fmtBalancesRes, (res, idx: number) => {
    const staker = stakers[idx]
    const underlying = staker.underlyings?.[0] as Contract

    return {
      ...staker,
      amount: res.output,
      underlyings: [underlying],
      rewards: undefined,
      category: 'stake',
    }
  })

  return balances
}
