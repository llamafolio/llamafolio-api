import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccess } from '@lib/array'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  userStacked: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userStacked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userLastReward: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userLastReward',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReward: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'uint32', name: '_lastRewardIndex', type: 'uint32' },
    ],
    name: 'getReward',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint32', name: 'lastRewardIndex', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTimeWarpStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const fmtBalances: Balance[] = []

  const calls: Call<typeof abi.userStacked>[] = stakers.map((staker) => ({
    target: staker.address,
    params: [ctx.address],
  }))

  const [userBalances, userLastRewardsIdxRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userStacked }),
    multicall({ ctx, calls, abi: abi.userLastReward }),
  ])

  const userRewards = await multicall({
    ctx,
    calls: mapSuccess(
      userLastRewardsIdxRes,
      (reward) => ({ target: reward.input.target, params: [ctx.address, reward.output] }) as const,
    ),
    abi: abi.getReward,
  })

  for (let stakeIdx = 0; stakeIdx < stakers.length; stakeIdx++) {
    const staker = stakers[stakeIdx]
    const underlyings = staker.underlyings && (staker.underlyings as Contract[])
    const rewards = staker.rewards?.[0] as Contract
    const userBalance = userBalances[stakeIdx]
    const _userRewards = userRewards[stakeIdx]
    const userReward = _userRewards.success ? _userRewards.output[0] : 0n

    if (!userBalance.success || !staker.token) {
      continue
    }

    const balance: Balance = {
      ...staker,
      address: staker.token,
      amount: userBalance.output,
      underlyings,
      rewards: [{ ...rewards, amount: userReward }],
      category: 'stake',
    }

    if (balance.underlyings) {
      fmtBalances.push(balance)
      continue
    }

    balances.push(balance)
  }

  return [...balances, ...(await getUnderlyingBalances(ctx, fmtBalances))]
}
