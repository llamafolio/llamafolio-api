import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
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

export async function getTangibleStakeBalance(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const fmtBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalancesRes, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  const balances: Balance[] = mapSuccessFilter(fmtBalances, (res, idx) => ({
    ...stakers[idx],
    amount: res.output,
    underlyings: stakers[idx].underlyings as Contract[],
    rewards: undefined,
    category: 'stake',
  }))

  return balances
}
