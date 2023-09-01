import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCVRFarmBalance(
  ctx: BalancesContext,
  farmer: Contract,
  rewardConverter: Contract,
): Promise<Balance> {
  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.pendingReward }),
  ])

  const fmtPendingRewardsRes = await call({
    ctx,
    target: rewardConverter.address,
    params: [userPendingRewardsRes],
    abi: abi.convertToAssets,
  })

  return {
    ...farmer,
    amount: userBalancesRes[0],
    underlyings: undefined,
    rewards: [{ ...(farmer.rewards?.[0] as Balance), amount: fmtPendingRewardsRes }],
    category: 'farm',
  }
}

export async function getCVRLPFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance[]> {
  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.pendingReward }),
  ])

  const balance: Balance = {
    ...farmer,
    address: farmer.token!,
    amount: userBalancesRes[0],
    underlyings: farmer.underlyings as Contract[],
    rewards: [{ ...(farmer.rewards?.[0] as Balance), amount: userPendingRewardsRes }],
    category: 'farm',
  }

  return getUnderlyingBalances(ctx, [balance])
}
