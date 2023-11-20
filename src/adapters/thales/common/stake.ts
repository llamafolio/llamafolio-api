import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  stakedBalanceOf: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'stakedBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getRewardsAvailable: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getRewardsAvailable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [
      { internalType: 'uint256', name: 'earnedFirstToken', type: 'uint256' },
      { internalType: 'uint256', name: 'earnedSecondToken', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      { internalType: 'uint256', name: 'amount0Current', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1Current', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalEscrowedRewards: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'totalAccountEscrowedAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getThalesStakingBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [stakeBalanceOf, pendingRewards] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakedBalanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getRewardsAvailable }),
  ])

  return {
    ...staker,
    amount: stakeBalanceOf,
    underlyings: undefined,
    rewards: [{ ...(staker.rewards?.[0] as Contract), amount: pendingRewards }],
    category: 'stake',
  }
}

export async function getThalesLPStakerBalance(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const [stakeBalanceOf, pendingRewards, underlyingBalances, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.token! }) as const),
      abi: abi.getUnderlyingBalances,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapMultiSuccessFilter(
    stakeBalanceOf.map((_, i) => [stakeBalanceOf[i], pendingRewards[i], underlyingBalances[i], totalSupply[i]]),

    (res, index) => {
      const staker = stakers[index]
      const rawUnderlyings = staker.underlyings as Contract[]
      const rawRewards = staker.rewards as Contract[]

      const [
        { output: stakeBalance },
        { output: rewardBalance },
        { output: underlyingBalances },
        { output: totalSupply },
      ] = res.inputOutputPairs

      if (totalSupply === 0n || !underlyingBalances || !rawUnderlyings || !rawRewards) return null

      const underlyings = rawUnderlyings.map((underlying, underlyingIdx) => {
        return { ...underlying, amount: (underlyingBalances[underlyingIdx] * stakeBalance) / totalSupply }
      })

      const rewards = rawRewards.map((reward, rewardIdx) => {
        return { ...reward, amount: rewardBalance[rewardIdx] }
      })

      return {
        ...staker,
        amount: stakeBalance,
        underlyings,
        rewards,
        category: 'stake' as Category,
      }
    },
  ).filter(isNotNullish)
}

export async function getVeThalesBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const stakeBalanceOf = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.totalEscrowedRewards,
  })

  return {
    ...staker,
    amount: stakeBalanceOf,
    underlyings: undefined,
    rewards: undefined,
    category: 'vest',
  }
}
