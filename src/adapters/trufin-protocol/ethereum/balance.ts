import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getUserInfo: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserInfo',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTrufinBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getUserInfo })

  return {
    ...staker,
    amount: userBalance[0],
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: userBalance[1] }],
    rewards: undefined,
    category: 'farm',
  }
}
