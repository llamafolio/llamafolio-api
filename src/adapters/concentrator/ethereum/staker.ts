import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { getCurveUnderlyingsBalances } from '@lib/curve/helper'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: '_shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserLocks: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserLocks',
    outputs: [
      {
        components: [
          { internalType: 'uint128', name: 'balance', type: 'uint128' },
          { internalType: 'uint64', name: 'unlockAt', type: 'uint64' },
          { internalType: 'uint64', name: '_', type: 'uint64' },
        ],
        internalType: 'struct CLeverAMOBase.LockBalance[]',
        name: '_locks',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balanceOf = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const underlyingsBalances = await call({
    ctx,
    target: staker.address,
    params: [balanceOf],
    abi: abi.convertToAssets,
  })

  return {
    ...staker,
    amount: balanceOf,
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: underlyingsBalances }],
    rewards: undefined,
    category: 'stake',
  }
}

export async function getStakeInPools(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const convertedBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(balances, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  const poolBalances: Balance[] = mapSuccessFilter(convertedBalances, (res, index) => ({
    ...(stakers[index] as Balance),
    amount: res.output,
    category: 'stake',
  }))

  return getCurveUnderlyingsBalances(ctx, poolBalances)
}

export async function getOldStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const [balanceOf, lockBalanceOf] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getUserLocks }),
  ])

  const poolBalance: Balance = {
    ...staker,
    amount: balanceOf,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }

  const lockBalances: Balance = {
    ...staker,
    amount: lockBalanceOf.length > 0 ? lockBalanceOf[0].balance : 0n,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }

  return getCurveUnderlyingsBalances(ctx, [poolBalance, lockBalances])
}
