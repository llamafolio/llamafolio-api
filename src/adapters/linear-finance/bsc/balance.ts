import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  GetUserCollateral: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'bytes32', name: '_currency', type: 'bytes32' },
    ],
    name: 'GetUserCollateral',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  GetUserDebtBalanceInUsd: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'GetUserDebtBalanceInUsd',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLinearLendBalances(
  ctx: BalancesContext,
  lender: Contract,
  borrower: Contract,
): Promise<Balance[]> {
  const [userLendBalances, userDebtBalances] = await Promise.all([
    call({ ctx, target: lender.address, params: [ctx.address, lender.currency], abi: abi.GetUserCollateral }),
    call({ ctx, target: borrower.address, params: [ctx.address], abi: abi.GetUserDebtBalanceInUsd }),
  ])

  const [debtAmount, _] = userDebtBalances

  return [
    {
      ...lender,
      amount: userLendBalances,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    },
    {
      ...borrower,
      amount: debtAmount,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    },
  ]
}
