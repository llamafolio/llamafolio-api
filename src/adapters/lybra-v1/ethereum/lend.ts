import type { BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { parseFloatBI } from '@lib/math'

const abi = {
  depositedEther: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'depositedEther',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBorrowedOf: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getBorrowedOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  badCollateralRate: {
    inputs: [],
    name: 'badCollateralRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLybraLendingBalances(ctx: BalancesContext, lendingPool: Contract) {
  const [userLendingBalance, userBorrowBalance, MCR] = await Promise.all([
    call({ ctx, target: lendingPool.address, params: [ctx.address], abi: abi.depositedEther }),
    call({ ctx, target: lendingPool.address, params: [ctx.address], abi: abi.getBorrowedOf }),
    call({ ctx, target: lendingPool.address, abi: abi.badCollateralRate }),
  ])

  const lendingBalance: LendBalance = {
    ...lendingPool,
    decimals: 18,
    amount: userLendingBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'lend',
  }

  const borrowBalance: BorrowBalance = {
    chain: ctx.chain,
    address: lendingPool.address,
    decimals: 18,
    amount: userBorrowBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'borrow',
  }

  return {
    balances: [lendingBalance, borrowBalance],
    MCR: MCR != null ? parseFloatBI(MCR, 18) / 100 : undefined,
  }
}
