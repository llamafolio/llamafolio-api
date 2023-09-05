import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getWithdrawalRequests: {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'getWithdrawalRequests',
    outputs: [{ internalType: 'uint256[]', name: 'requestsIds', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getWithdrawalStatus: {
    inputs: [{ internalType: 'uint256[]', name: '_requestIds', type: 'uint256[]' }],
    name: 'getWithdrawalStatus',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amountOfStETH', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOfShares', type: 'uint256' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'bool', name: 'isFinalized', type: 'bool' },
          { internalType: 'bool', name: 'isClaimed', type: 'bool' },
        ],
        internalType: 'struct WithdrawalQueueBase.WithdrawalRequestStatus[]',
        name: 'statuses',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUnstakeLidoBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const requestIds = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getWithdrawalRequests })

  const userBalances = await call({
    ctx,
    target: staker.address,
    params: [requestIds],
    abi: abi.getWithdrawalStatus,
  })

  return userBalances.map((res) => {
    const { amountOfStETH } = res

    return {
      ...staker,
      amount: amountOfStETH,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    }
  })
}
