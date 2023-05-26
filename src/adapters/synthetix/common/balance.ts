import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance, RewardBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  collateral: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'collateral',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  remainingIssuableSynths: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'remainingIssuableSynths',
    outputs: [
      { internalType: 'uint256', name: 'maxIssuable', type: 'uint256' },
      { internalType: 'uint256', name: 'alreadyIssued', type: 'uint256' },
      { internalType: 'uint256', name: 'totalSystemDebt', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  feesAvailable: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'feesAvailable',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSNXBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const [userLendBalanceOf, userDebtBalanceOf, userPendingRewardBalanceOf] = await Promise.all([
    call({
      ctx,
      target: contract.token!,
      params: [ctx.address],
      abi: abi.collateral,
    }),
    call({
      ctx,
      target: contract.token!,
      params: [ctx.address],
      abi: abi.remainingIssuableSynths,
    }),
    call({
      ctx,
      target: contract.rewarder,
      params: [ctx.address],
      abi: abi.feesAvailable,
    }),
  ])

  const [_maxIssuable, alreadyIssued, _totalSystemDebt] = userDebtBalanceOf

  const lendBalance: LendBalance = {
    ...contract,
    amount: BigNumber.from(userLendBalanceOf),
    underlyings: undefined,
    rewards: undefined,
    category: 'lend',
  }

  const borrowBalance: BorrowBalance = {
    ...contract,
    amount: BigNumber.from(alreadyIssued),
    underlyings: contract.underlyings as Contract[],
    rewards: undefined,
    category: 'borrow',
  }

  const rewardBalance: RewardBalance = {
    ...contract,
    amount: BigNumber.from(userPendingRewardBalanceOf[1]),
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }

  return [lendBalance, borrowBalance, rewardBalance]
}
