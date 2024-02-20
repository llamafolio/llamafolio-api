import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getClaimAmounts: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getClaimAmounts',
    outputs: [
      { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'claimedAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'claimableAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEQVestBalance(ctx: BalancesContext, vester: Contract): Promise<Balance> {
  const [_, __, amount] = await call({ ctx, target: vester.address, params: [ctx.address], abi: abi.getClaimAmounts })

  return {
    ...vester,
    amount,
    underlyings: undefined,
    rewards: undefined,
    category: 'vest',
  }
}
