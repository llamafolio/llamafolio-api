import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getUserMaticXSwapRequests: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getUserMaticXSwapRequests',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'requestTime', type: 'uint256' },
          { internalType: 'uint256', name: 'withdrawalTime', type: 'uint256' },
        ],
        internalType: 'struct IChildPool.MaticXSwapRequest[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStaderFarmBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const userBalance = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.getUserMaticXSwapRequests,
  })

  return {
    ...contract,
    address: contract.token!,
    amount: userBalance[0]?.amount || 0n,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }
}
