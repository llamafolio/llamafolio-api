import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  stakeBalanceOfv1: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'stakedBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakeBalanceOfv2: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'stakeBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCLYv1StakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const amount = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.stakeBalanceOfv1,
  })

  return {
    ...staker,
    amount,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getCLYv2StakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const amount = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.stakeBalanceOfv2,
  })

  return {
    ...staker,
    amount,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
