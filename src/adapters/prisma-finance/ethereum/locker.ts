import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { parseEther } from 'viem'

const abi = {
  getAccountBalances: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getAccountBalances',
    outputs: [
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      { internalType: 'uint256', name: 'unlocked', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPrismaLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const [lock, unlock] = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.getAccountBalances,
  })

  return {
    ...locker,
    // amount is expressed in token units
    amount: lock * parseEther('1.0'),
    claimable: unlock * parseEther('1.0'),
    underlyings: undefined,
    rewards: undefined,
    category: 'lock',
  }
}
