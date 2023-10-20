import type { Balance, BalancesContext, Contract, RewardBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  stake: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'stake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingMIMO: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingMIMO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingPAR: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingPAR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getParallelParStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, pendingPAR, pendingMimo] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stake }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.pendingPAR }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.pendingMIMO }),
  ])

  const [PAR, MIMO] = staker.rewards as Contract[]

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [
      { ...PAR, amount: pendingPAR },
      { ...MIMO, amount: pendingMimo },
    ],
    category: 'stake',
  }
}

export async function getParallelMimoRewardsBalances(
  ctx: BalancesContext,
  rewarders: Contract[],
): Promise<RewardBalance[]> {
  const pendingMimosRes = await multicall({
    ctx,
    calls: rewarders.map((rewarder) => ({ target: rewarder.address, params: [ctx.address] }) as const),
    abi: abi.pendingMIMO,
  })

  return mapSuccessFilter(pendingMimosRes, (res, index) => ({
    ...rewarders[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }))
}
