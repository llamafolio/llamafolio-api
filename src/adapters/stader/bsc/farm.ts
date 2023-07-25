import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getUserWithdrawalRequests: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getUserWithdrawalRequests',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'uuid', type: 'uint256' },
          { internalType: 'uint256', name: 'amountInBnbX', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
        ],
        internalType: 'struct IStakeManager.WithdrawalRequest[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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

export async function getStaderFarmBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const userRequest = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.getUserWithdrawalRequests,
  })

  const userRequestStatus = await multicall({
    ctx,
    calls: rangeBI(0n, BigInt(userRequest.length)).map(
      (idx) => ({ target: contract.address, params: [ctx.address, idx] }) as const,
    ),
    abi: abi.getUserRequestStatus,
  })

  const balances: Balance[] = mapSuccessFilter(userRequestStatus, (res) => {
    const [_isClaimable, _amount] = res.output

    return {
      ...contract,
      address: contract.token!,
      amount: _amount,
      underlyings: undefined,
      rewards: undefined,
      category: 'farm',
    }
  })

  return balances
}
