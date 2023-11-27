import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
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

export async function getStakerBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalancesOfs = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const fmtUserBalancesOfs = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalancesOfs, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(fmtUserBalancesOfs, (res, index) => {
    const underlying = (stakers[index].underlyings?.[0] as Contract) ?? undefined

    return {
      ...stakers[index],
      amount: res.input.params[0],
      underlyings: [{ ...underlying, amount: res.output }],
      rewards: undefined,
      category: 'stake',
    }
  })
}

export async function getPoolStakingBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const poolBalances = await getStakerBalances(ctx, [contract])
  return getCurveUnderlyingsBalances(ctx, poolBalances)
}
