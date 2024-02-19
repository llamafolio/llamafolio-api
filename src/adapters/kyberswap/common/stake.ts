import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getLatestStakeBalance: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getLatestStakeBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getKNCStakeBalance(ctx: BalancesContext, sKNC: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: sKNC.address, params: [ctx.address], abi: abi.getLatestStakeBalance })

  return {
    ...sKNC,
    amount: userBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
