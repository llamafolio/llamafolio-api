import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getSentimentStakerBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] })),
    abi: erc20Abi.balanceOf,
  })

  const fmtBalancesRes = await multicall({
    ctx,
    calls: userBalancesRes.map((balance) =>
      isSuccess(balance) ? { target: balance.input.target, params: [balance.output] } : null,
    ),
    abi: abi.convertToAssets,
  })

  const balances: Balance[] = mapSuccessFilter(fmtBalancesRes, (res, idx: number) => {
    const staker = stakers[idx]
    const underlying = staker.underlyings?.[0] as Contract

    return {
      ...staker,
      amount: BigNumber.from(res.output),
      underlyings: [underlying],
      rewards: undefined,
      category: 'stake',
    }
  })

  return balances
}
