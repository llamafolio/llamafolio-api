import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  users: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'users',
    outputs: [
      { internalType: 'uint256', name: 'stakedTokens', type: 'uint256' },
      { internalType: 'uint256', name: 'debtDai', type: 'uint256' },
      { internalType: 'uint256', name: 'stakedNftsCount', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBoostTokens', type: 'uint256' },
      { internalType: 'uint256', name: 'harvestedRewardsDai', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalGnsStaked: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'totalGnsStaked',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakers: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakers',
    outputs: [
      { internalType: 'uint128', name: 'stakedGns', type: 'uint128' },
      { internalType: 'uint128', name: 'debtDai', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRewardDai: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'pendingRewardDai',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRewardDaiFromUnlocks: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'pendingRewardDaiFromUnlocks',
    outputs: [{ internalType: 'uint128', name: 'pending', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRewardTokens: {
    inputs: [{ internalType: 'address', name: '_staker', type: 'address' }],
    name: 'pendingRewardTokens',
    outputs: [{ internalType: 'uint128[]', name: 'pendingTokens', type: 'uint128[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGainsNetworkStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const stakeBalance = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.users,
  })

  return {
    ...staker,
    amount: stakeBalance[0],
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getsgGNSBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [stakeBalance, pendingRewardTokens] = await Promise.all([
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: abi.totalGnsStaked,
    }),
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: abi.pendingRewardTokens,
    }),
  ])

  const rewards = (staker.rewards as Contract[]).map((reward, rewardIdx) => {
    return { ...reward, amount: pendingRewardTokens[rewardIdx] }
  })

  return {
    ...staker,
    amount: stakeBalance,
    underlyings: undefined,
    rewards,
    category: 'stake',
  }
}
