import type { BalancesContext, Contract, StakeBalance } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  balances: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getWoofiStakeBalance(ctx: BalancesContext, staker: Contract): Promise<StakeBalance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.balances })
  return {
    ...staker,
    amount: userBalance,
    underlyings: staker.underlyings as Contract[],
    rewards: undefined,
    category: 'stake',
  }
}
