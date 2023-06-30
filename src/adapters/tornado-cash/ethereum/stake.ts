import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  lockedBalance: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lockedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  checkReward: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'checkReward',
    outputs: [{ internalType: 'uint256', name: 'rewards', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTornadoStakeBalances(ctx: BalancesContext, staker: Contract) {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.lockedBalance })
  // TODO: get staking rewards

  const balance = {
    ...staker,
    amount: userBalance,
    category: 'stake',
  } as Balance

  return balance
}
