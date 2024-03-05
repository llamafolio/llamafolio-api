import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  poolValue: {
    inputs: [],
    name: 'poolValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [
      {
        internalType: 'contract IERC20',
        name: 'token',
        type: 'address',
      },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  staked: {
    inputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'address', name: 'staker', type: 'address' },
    ],
    name: 'staked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  farmClaimable: {
    inputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const TRU: Token = {
  chain: 'ethereum',
  address: '0x4c19596f5aaff459fa38b0f7ed92f11ae6543784',
  symbol: 'TRU',
  decimals: 8,
}

export async function getTruefiBalances(
  ctx: BalancesContext,
  stakers: Contract[],
  farmer: Contract,
): Promise<Balance[]> {
  const [userBalances, tokenBalances, totalSupplies, userFarmBalances, farmRewards] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address }) as const),
      abi: abi.poolValue,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: farmer.address, params: [staker.address, ctx.address] }) as const),
      abi: abi.staked,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: farmer.address, params: [staker.address, ctx.address] }) as const),
      abi: abi.farmClaimable,
    }),
  ])

  const stakeBalances: Balance[] = mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], tokenBalances[i], totalSupplies[i]]),

    (res, index) => {
      const staker = stakers[index]
      const rawUnderlying = staker.underlyings![0] as Contract
      const [{ output: amount }, { output: tokenBalance }, { output: supply }] = res.inputOutputPairs

      if (!rawUnderlying || supply === 0n) return null
      const underlyings = [{ ...rawUnderlying, amount: (amount * tokenBalance) / supply }]

      return {
        ...staker,
        amount,
        underlyings,
        rewards: undefined,
        category: 'stake',
      }
    },
  ).filter(isNotNullish)

  const farmBalances: Balance[] = mapMultiSuccessFilter(
    userFarmBalances.map((_, i) => [userFarmBalances[i], farmRewards[i], tokenBalances[i], totalSupplies[i]]),

    (res, index) => {
      const staker = stakers[index]
      const rawUnderlying = staker.underlyings![0] as Contract
      const [{ output: amount }, { output: rewardBalance }, { output: tokenBalance }, { output: supply }] =
        res.inputOutputPairs

      if (!rawUnderlying || supply === 0n) return null
      const underlyings = [{ ...rawUnderlying, amount: (amount * tokenBalance) / supply }]

      return {
        ...staker,
        amount,
        underlyings,
        rewards: [{ ...TRU, amount: rewardBalance }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish)

  return [...stakeBalances, ...farmBalances]
}

export async function getTRUStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userShare, pendingReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address, TRU.address], abi: abi.claimable }),
  ])

  return {
    ...staker,
    amount: userShare,
    underlyings: [{ ...TRU, amount: userShare }],
    rewards: [{ ...TRU, amount: pendingReward }],
    category: 'stake',
  }
}

export async function getTruefiFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const userShare = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const userAsset = await call({ ctx, target: farmer.address, params: [userShare], abi: abi.convertToAssets })

  return {
    ...farmer,
    amount: userShare,
    underlyings: [{ ...(farmer.underlyings![0] as Contract), amount: userAsset }],
    rewards: undefined,
    category: 'farm',
  }
}
