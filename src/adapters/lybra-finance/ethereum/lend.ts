import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

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
}

export async function getLybraLendingBalances(ctx: BalancesContext, lendingPool: Contract): Promise<Balance[]> {
  console.log(lendingPool)

  const [{ output: userLendingBalance }, { output: userBorrowBalance }] = await Promise.all([
    call({ ctx, target: lendingPool.address, params: [ctx.address], abi: abi.depositedEther }),
    call({ ctx, target: lendingPool.address, params: [ctx.address], abi: abi.getBorrowedOf }),
  ])

  const lendingBalance: LendBalance = {
    ...lendingPool,
    decimals: 18,
    amount: BigNumber.from(userLendingBalance),
    underlyings: undefined,
    rewards: undefined,
    category: 'lend',
  }

  const borrowBalance: BorrowBalance = {
    chain: ctx.chain,
    address: lendingPool.address,
    decimals: 18,
    amount: BigNumber.from(userBorrowBalance),
    underlyings: undefined,
    rewards: undefined,
    category: 'borrow',
  }

  return [lendingBalance, borrowBalance]
}
