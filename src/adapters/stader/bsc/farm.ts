import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getUserRequestStatus: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'uint256', name: '_idx', type: 'uint256' },
    ],
    name: 'getUserRequestStatus',
    outputs: [
      { internalType: 'bool', name: '_isClaimable', type: 'bool' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStaderFarmBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const userRequestStatus = await call({
    ctx,
    target: contract.address,
    params: [ctx.address, 0n],
    abi: abi.getUserRequestStatus,
  })

  const [_isClaimable, _amount] = userRequestStatus

  return {
    ...contract,
    address: contract.token!,
    amount: _amount,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }
}
