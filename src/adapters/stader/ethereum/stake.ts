import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  operatorSDBalance: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'operatorSDBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSDCollateralBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.operatorSDBalance })

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
