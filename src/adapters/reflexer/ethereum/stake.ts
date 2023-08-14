import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  descendantBalanceOf: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'descendantBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getReflexerStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.descendantBalanceOf })

  return getUnderlyingBalances(ctx, [
    {
      ...staker,
      address: staker.token!,
      amount: userBalance,
      underlyings: staker.underlyings as Contract[],
      rewards: undefined,
      category: 'stake',
    },
  ])
}
