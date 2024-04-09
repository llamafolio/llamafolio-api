import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getDepositAmount: {
    inputs: [
      { internalType: 'address', name: 'depositOwner', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
    ],
    name: 'getDepositAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBobBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const allowedTokens = staker.underlyings as Contract[]
  if (!allowedTokens) return []

  const userDeposits = await multicall({
    ctx,
    calls: allowedTokens.map((token) => ({ target: staker.address, params: [ctx.address, token.address] }) as const),
    abi: abi.getDepositAmount,
  })

  return mapSuccessFilter(userDeposits, (res, index) => {
    return {
      ...staker,
      amount: res.output,
      underlyings: [{ ...allowedTokens[index], amount: res.output }],
      rewards: undefined,
      category: 'stake',
    }
  })
}
