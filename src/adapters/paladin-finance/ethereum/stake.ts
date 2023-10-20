import type { Balance, BalancesContext, Contract, LockBalance, RewardBalance, StakeBalance } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  underlyingBalanceOf: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'underlyingBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  estimateClaimableRewards: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'estimateClaimableRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserLock: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserLock',
    outputs: [
      {
        components: [
          { internalType: 'uint128', name: 'amount', type: 'uint128' },
          { internalType: 'uint48', name: 'startTimestamp', type: 'uint48' },
          { internalType: 'uint48', name: 'duration', type: 'uint48' },
          { internalType: 'uint32', name: 'fromBlock', type: 'uint32' },
        ],
        internalType: 'struct HolyPaladinToken.UserLock',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  allBalancesOf: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'allBalancesOf',
    outputs: [
      { internalType: 'uint256', name: 'staked', type: 'uint256' },
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      { internalType: 'uint256', name: 'available', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userCurrentStakedAmount: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userCurrentStakedAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PAL: Token = {
  chain: 'ethereum',
  address: '0xab846fb6c81370327e784ae7cbb6d6a6af6ff4bf',
  decimals: 18,
  symbol: 'PAL',
}

export async function getPaladinStakeBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.staker, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.staker, params: [ctx.address] }) as const),
      abi: abi.underlyingBalanceOf,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], underlyingsBalancesRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings?.[0] as Contract

      if (!underlying) return null

      const [{ output: userBalance }, { output: underlyingsBalance }] = res.inputOutputPairs

      return {
        ...pool,
        amount: userBalance,
        underlyings: [{ ...underlying, amount: underlyingsBalance }],
        rewards: undefined,
        category: 'stake',
      }
    },
  ).filter(isNotNullish) as Balance[]
}

export async function getPaladinStakeBalancesFromdstkAave(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const userBalance = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.userCurrentStakedAmount,
  })

  return { ...contract, amount: userBalance, underlyings: undefined, rewards: undefined, category: 'stake' }
}

export async function gethPalBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const [allBalancesOf, lockedBalance, pendingReward] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.allBalancesOf }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.getUserLock }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.estimateClaimableRewards }),
  ])

  const [_, locked, available] = allBalancesOf
  const { startTimestamp, duration } = lockedBalance

  const now = Date.now() / 1000
  const unlockAt = Number(startTimestamp + duration)

  const stakeBalance: StakeBalance = {
    ...contract,
    amount: available,
    underlyings: [PAL],
    rewards: undefined,
    category: 'stake',
  }

  const lockBalance: LockBalance = {
    ...contract,
    amount: locked,
    unlockAt,
    claimable: now > unlockAt ? locked : 0n,
    underlyings: [PAL],
    rewards: undefined,
    category: 'lock',
  }

  const rewardBalance: RewardBalance = {
    ...PAL,
    amount: pendingReward,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }

  return [stakeBalance, lockBalance, rewardBalance]
}
