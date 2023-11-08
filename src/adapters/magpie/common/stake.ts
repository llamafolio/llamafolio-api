import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  userInfos: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfos',
    outputs: [
      { internalType: 'uint256', name: 'deposited', type: 'uint256' },
      { internalType: 'uint256', name: 'factor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMagpieStaker(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [deposited] = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userInfos })

  return {
    ...staker,
    amount: deposited,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
