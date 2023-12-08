import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  getStake: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBaseReward: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getBaseReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDelegationReward: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getDelegationReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getStakerPrincipal: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getStakerPrincipal',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReward: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const LINK: Token = {
  chain: 'ethereum',
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  decimals: 18,
  symbol: 'LINK',
}

export async function getLinkStaker_v1Balance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balanceOf, rewardsOf, delegateRewards] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getStake }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getBaseReward }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getDelegationReward }),
  ])

  return {
    ...staker,
    amount: balanceOf,
    underlyings: undefined,
    rewards: [{ ...LINK, amount: rewardsOf + delegateRewards }],
    category: 'stake',
  }
}

export async function getLinkStaker_v2Balances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const [userBalances, userPendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: abi.getStakerPrincipal,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.rewarder, params: [ctx.address] }) as const),
      abi: abi.getReward,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userPendingRewards[i]]),

    (res, index) => {
      const staker = stakers[index]
      const [{ output: userBalance }, { output: userRewards }] = res.inputOutputPairs

      if (userBalance === 0n) return null

      return {
        ...staker,
        amount: userBalance,
        underlyings: undefined,
        rewards: [{ ...LINK, amount: userRewards }],
        category: 'stake' as Category,
      }
    },
  ).filter(isNotNullish)
}
