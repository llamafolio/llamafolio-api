import type { BalancesContext, BorrowBalance, Contract, LendBalance, RewardBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { parseFloatBI } from '@lib/math'

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
  collateralisationRatio: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_issuer', type: 'address' }],
    name: 'collateralisationRatio',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSNXBalances(ctx: BalancesContext, contract?: Contract) {
  if (!contract) return
  const [userLendBalanceOf, userDebtBalanceOf, userPendingRewardBalanceOf, collateralisationRatio] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.collateral,
    }),
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.remainingIssuableSynths,
    }),
    call({
      ctx,
      target: contract.rewarder,
      params: [ctx.address],
      abi: abi.feesAvailable,
    }),
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.collateralisationRatio,
    }),
  ])

  const [_maxIssuable, alreadyIssued, _totalSystemDebt] = userDebtBalanceOf

  const lendBalance: LendBalance = {
    ...contract,
    amount: userLendBalanceOf,
    underlyings: undefined,
    rewards: undefined,
    category: 'lend',
  }

  const borrowBalance: BorrowBalance = {
    ...contract.asset,
    amount: alreadyIssued,
    underlyings: undefined,
    rewards: undefined,
    category: 'borrow',
  }

  const rewardBalance: RewardBalance = {
    ...contract,
    amount: userPendingRewardBalanceOf[1],
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }

  return {
    balances: [lendBalance, borrowBalance, rewardBalance],
    healthFactor: 1 / parseFloatBI(collateralisationRatio, 18),
  }
}
