import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getSingleStakeBalance } from '@lib/stake'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getActiveLocks: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getActiveLocks',
    outputs: [{ internalType: 'uint256[2][]', name: '', type: 'uint256[2][]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUnlockable: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUnlockable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserRedeemsLength: {
    inputs: [{ internalType: 'address', name: 'userAddress', type: 'address' }],
    name: 'getUserRedeemsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userRedeems: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'userRedeems',
    outputs: [
      { internalType: 'uint256', name: 'eqbAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'xEqbAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEqLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance | undefined> {
  const [userBalance, unlockable, pendingReward] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getActiveLocks }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getUnlockable }),
    call({
      ctx,
      target: locker.address,
      params: [ctx.address, (locker.rewards?.[0] as Contract).address],
      abi: abi.earned,
    }),
  ])

  if (!userBalance[0]) return

  const [end, amount] = userBalance[0]
  const unlockAt = Number(end)

  return {
    ...locker,
    amount,
    claimable: unlockable,
    unlockAt,
    underlyings: undefined,
    rewards: [{ ...(locker.rewards?.[0] as Contract), amount: pendingReward }],
    category: 'lock',
  }
}

export async function getxEqbLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const [userStakexEQB, userRedeemsLength] = await Promise.all([
    getSingleStakeBalance(ctx, locker),
    call({
      ctx,
      target: locker.address,
      params: [ctx.address],
      abi: abi.getUserRedeemsLength,
    }),
  ])

  const userRedeem = await multicall({
    ctx,
    calls: rangeBI(0n, userRedeemsLength).map((i) => ({ target: locker.address, params: [ctx.address, i] }) as const),
    abi: abi.userRedeems,
  })

  const lockBalances: Balance[] = mapSuccessFilter(userRedeem, (res) => {
    const [eqbAmount, xEqbAmount, endTime] = res.output
    const unlockAt = Number(endTime)
    const now = Date.now() / 1000

    return {
      ...locker,
      amount: xEqbAmount,
      unlockAt,
      claimable: now > unlockAt ? xEqbAmount : 0n,
      underlyings: [{ ...(locker.underlyings?.[0] as Contract), amount: eqbAmount }],
      rewards: undefined,
      category: 'lock',
    }
  })

  return [userStakexEQB, ...lockBalances]
}
